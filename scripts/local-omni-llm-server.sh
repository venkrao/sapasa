#!/usr/bin/env bash
# SaPaSa local LLM helpers for the AI vocal coach:
#   - Apple Silicon: --mlx-setup installs mlx-lm-omni deps and pre-downloads Qwen2.5-Omni MLX weights.
#   - NVIDIA/CUDA: vLLM "serve" OpenAI-compatible API; point SAPASA_COACH_LLM_BASE_URL at it.
#
# References:
#   - Qwen2.5-Omni + vLLM: https://github.com/QwenLM/Qwen2.5-Omni
#   - MLX Omni (Mac): https://github.com/giangndm/mlx-lm-omni

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="${REPO_ROOT}/backend"

HOST="${HOST:-127.0.0.1}"
PORT="${PORT:-8000}"
MODEL="${MODEL:-Qwen/Qwen2.5-Omni-7B}"
DTYPE="${DTYPE:-bfloat16}"
# Optional multi-GPU: TP=2 ./scripts/local-omni-llm-server.sh
TP="${TP:-}"

# Default MLX checkpoint (override with --mlx-model or SAPASA_COACH_MLX_MODEL)
MLX_MODEL_DL="${SAPASA_COACH_MLX_MODEL:-giangndm/qwen2.5-omni-3b-mlx-4bit}"

DRY_RUN=0
PRINT_ENV=0
DOCKER_HELP=0
APPLE_HELP=0
FORCE_MAC=0
MLX_SETUP=0

usage() {
  cat <<'EOF'

Usage:
  ./scripts/local-omni-llm-server.sh [options]

Options:
  --mlx-setup              (Apple Silicon) pip install coach MLX deps + pre-download HF weights
  --mlx-model MODEL        Model id for --mlx-setup (default: giangndm/qwen2.5-omni-3b-mlx-4bit)
  --host ADDR              Bind address (default: 127.0.0.1)
  --port N                 Port (default: 8000)
  --model MODEL            Hugging Face model id (default: Qwen/Qwen2.5-Omni-7B)
  --dtype DTYPE            e.g. bfloat16, float16 (default: bfloat16)
  --tensor-parallel-size N Set tensor parallel size (multi-GPU); also env TP=N
  --dry-run                Print the vLLM command (works on macOS; for reference / Linux)
  --print-sapasa-env       Print export lines for the SaPaSa backend (works on macOS)
  --apple-silicon-help     M1/M2/M3: how to use SaPaSa coach without local CUDA (read this first)
  --docker-help            NVIDIA Docker notes (Linux + NVIDIA GPU host)
  --force-mac              Try to exec vllm on macOS anyway (almost always fails)
  -h, --help                This help

Environment (same meaning as flags):
  HOST PORT MODEL DTYPE TP  SAPASA_COACH_MLX_MODEL (default MLX id for --mlx-setup)

SaPaSa backend (after a compatible server is listening on this host:port):
  export SAPASA_COACH_LLM_BASE_URL=http://127.0.0.1:PORT/v1
  export SAPASA_COACH_LLM_MODEL="MODEL"

Install vLLM (CUDA Linux / Windows with CUDA — not Apple Silicon GPU):
  pip install 'vllm>=0.8.5'

If you need the historical Qwen Omni fork, see Qwen2.5-Omni "Deployment with vLLM"
in the upstream README (branch / docker image may apply).

EOF
}

apple_silicon_help() {
  cat <<'EOF'
Apple Silicon (M1 / M2 / M3 / M4) — real Qwen2.5-Omni without vLLM
------------------------------------------------------------------
vLLM targets NVIDIA CUDA; you do not need it on a Mac for SaPaSa’s coach.

**Recommended (local, real model, same process as the pitch server):**

  From the repo root (once, to install deps + download weights — can take a while, several GB):

    ./scripts/local-omni-llm-server.sh --mlx-setup

  Then:

    cd backend && source .venv/bin/activate
    export SAPASA_COACH_MLX_MODEL=giangndm/qwen2.5-omni-3b-mlx-4bit
    python main.py

  Use --mlx-model HF/id if you want a different MLX checkpoint. First /coach/feedback still
  loads the model into RAM (fast if weights are already cached).

**Alternative:** run vLLM on a Linux + NVIDIA machine and SSH-tunnel, then:

  ./scripts/local-omni-llm-server.sh --print-sapasa-env

**Plumbing only (no LLM):** omit both SAPASA_COACH_MLX_MODEL and SAPASA_COACH_LLM_BASE_URL
→ mock responses for UI tests.

**Reference:** ./scripts/local-omni-llm-server.sh --dry-run  (vLLM command for Linux)

NVIDIA Docker: --docker-help

Experimental: --force-mac only if you have a nonstandard vllm build on macOS.

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mlx-setup) MLX_SETUP=1; shift ;;
    --mlx-model) MLX_MODEL_DL="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --dtype) DTYPE="$2"; shift 2 ;;
    --tensor-parallel-size) TP="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --print-sapasa-env) PRINT_ENV=1; shift ;;
    --docker-help) DOCKER_HELP=1; shift ;;
    --apple-silicon-help) APPLE_HELP=1; shift ;;
    --force-mac) FORCE_MAC=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

mlx_setup() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    cat >&2 <<'EOF'
--mlx-setup is intended for Apple Silicon (macOS): MLX + Qwen2.5-Omni run locally here.
On Linux + NVIDIA, use vLLM instead (see --help and pip install vllm).
EOF
    exit 1
  fi

  local py="${BACKEND_DIR}/.venv/bin/python"
  if [[ ! -x "$py" ]]; then
    py="$(command -v python3 || true)"
    if [[ -z "$py" ]]; then
      echo "mlx-setup: no backend/.venv and no python3 on PATH. Create a venv first:" >&2
      echo "  cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt" >&2
      exit 1
    fi
    echo "mlx-setup: warning: using $py (no backend/.venv); recommend a backend venv." >&2
  fi

  echo "mlx-setup: installing ${BACKEND_DIR}/requirements-coach-mlx.txt ..."
  (cd "$BACKEND_DIR" && "$py" -m pip install -r requirements-coach-mlx.txt)
  "$py" -m pip install -q 'huggingface_hub>=0.26'

  echo "mlx-setup: downloading Hugging Face weights for: ${MLX_MODEL_DL}"
  echo "mlx-setup: (this can take a long time and use several GB of disk)"
  SAPASA_COACH_MLX_MODEL="${MLX_MODEL_DL}" "$py" -c "
import os
from huggingface_hub import snapshot_download
mid = os.environ['SAPASA_COACH_MLX_MODEL'].strip()
print('snapshot_download:', mid)
snapshot_download(repo_id=mid)
print('mlx-setup: download complete.')
"

  cat <<EOF

Next (run the pitch server with the coach enabled):

  export SAPASA_COACH_MLX_MODEL="${MLX_MODEL_DL}"
  cd backend && ${py} main.py

Check coach mode:  curl -s http://127.0.0.1:8765/coach/health
  (expect \"inference\": \"mlx\")

Some gated models need:  huggingface-cli login   or   export HF_TOKEN=...
EOF
}

if [[ "$MLX_SETUP" -eq 1 ]]; then
  mlx_setup
  exit 0
fi

print_sapasa_env() {
  echo "# Point SaPaSa backend at this OpenAI-compatible base URL (e.g. after vLLM listens)"
  echo "export SAPASA_COACH_LLM_BASE_URL=\"http://${HOST}:${PORT}/v1\""
  echo "export SAPASA_COACH_LLM_MODEL=\"${MODEL}\""
}

docker_help() {
  cat <<'EOF'
NVIDIA Docker (Linux host with nvidia-container-toolkit; not for Apple Silicon GPUs):

  # Official Qwen Omni image (CUDA 12.1) — see Qwen2.5-Omni README "Docker" section.
  docker run --gpus all --ipc=host --network=host --rm -it \
    qwenllm/qwen-omni:2.5-cu121 bash

  Inside the container, follow Qwen docs to launch vLLM serve or their web demo,
  with the checkpoint mounted or downloaded to a path you pass to their scripts.

For a minimal vLLM-only container (if you maintain your own image), pattern is:

  docker run --gpus all --rm -p 8000:8000 -e HF_HOME=/cache \
    -v "$HOME/.cache/huggingface:/cache" \
    vllm/vllm-openai:latest \
    --model Qwen/Qwen2.5-Omni-7B ...

Adjust image name and flags to match your installed vLLM build; Qwen’s README is authoritative.
EOF
}

if [[ "$APPLE_HELP" -eq 1 ]]; then
  apple_silicon_help
  exit 0
fi

if [[ "$DOCKER_HELP" -eq 1 ]]; then
  docker_help
  exit 0
fi

if [[ "$PRINT_ENV" -eq 1 ]]; then
  print_sapasa_env
  exit 0
fi

ARGS=(serve "$MODEL" --host "$HOST" --port "$PORT" --dtype "$DTYPE")
if [[ -n "${TP}" ]]; then
  ARGS+=(--tensor-parallel-size "$TP")
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Command to run on a CUDA-capable machine with vLLM installed:"
  printf ' '
  printf '%q ' vllm "${ARGS[@]}"
  echo
  exit 0
fi

if [[ "$(uname -s)" == "Darwin" && "$FORCE_MAC" -ne 1 ]]; then
  apple_silicon_help >&2
  echo >&2 "To show only this guide:  $0 --apple-silicon-help"
  echo >&2 "To print backend env for a tunneled server:  $0 --print-sapasa-env"
  exit 1
fi

if ! command -v vllm >/dev/null 2>&1; then
  cat >&2 <<'EOF'
"vllm" not found on PATH.

On Apple Silicon, install vLLM on a Linux + NVIDIA host (or cloud GPU), not on the Mac
for standard Omni support — see:  ./scripts/local-omni-llm-server.sh --apple-silicon-help

On CUDA Linux (example):
  python3 -m venv .venv && source .venv/bin/activate
  pip install 'vllm>=0.8.5'

Then re-run this script, or use --dry-run (works on a Mac) to copy the command line.
EOF
  exit 1
fi

echo "Starting vLLM OpenAI-compatible server..."
echo "  Model: $MODEL"
echo "  Listen: http://${HOST}:${PORT}/v1"
print_sapasa_env
echo ""
exec vllm "${ARGS[@]}"
