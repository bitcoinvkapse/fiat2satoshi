#!/usr/bin/env bash
# Fiat2Satoshi — inicializační git skript.
# NEJDŘÍV nahraď bitcoinvkapse svým uživatelským jménem na GitHubu.
set -euo pipefail

git init
git add .
git commit -m "feat: initial project structure"
git branch -M main
git remote add origin https://github.com/bitcoinvkapse/fiat2satoshi.git
git push -u origin main
