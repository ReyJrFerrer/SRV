#!/bin/bash
set -e

echo "🚀 Setting up ICP Vibe Coding development environment..."

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Set up dfx identity for codespace
echo "🔑 Setting up dfx identity..."
dfxvm install 0.25.0
dfx identity new codespace_dev --storage-mode=plaintext || echo "Identity may already exist"
dfx identity use codespace_dev      
dfx start --background             
dfx stop

# Install mops dependencies
echo "📦 Installing mops dependencies..."
npm install -g ic-mops
mops install

# Install jq for JSON parsing in scripts
echo "🔧 Installing utilities..."
apt-get update && apt-get install -y jq curl

# Install Ollama for local LLM support
echo "🤖 Installing Ollama for LLM support..."
curl -fsSL https://ollama.com/install.sh | sh

echo "✅ Development environment setup complete!"
