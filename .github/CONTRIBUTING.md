# Contributing to Morphs OS

First off, thank you for considering contributing to Morphs OS. It's people like you that make Morphs OS such a powerful autonomous agent platform.

## Code of Conduct
This project and everyone participating in it is governed by the [Morphs OS Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs
This section guides you through submitting a bug report for Morphs OS.
* **Use the Bug Report Template**: We have a template for bug reports in our `.github/ISSUE_TEMPLATE` directory.
* **Check the Issue Tracker**: Someone might have already reported the bug. If so, please add your information to the existing issue.
* **Provide Context**: Include your OS (e.g., macOS M3), MLX version, and the stack trace captured by `healer_morph`.

### Suggesting Enhancements
* **Use the Feature Request Template**.
* **Explain the Architectural Need**: Morphs OS operates on a specialized swarm architecture. Explain how your feature fits into the event bus or agent hierarchy.

### Pull Requests
1. Fork the repo and create your branch from `main`.
2. Ensure you run the `pytest` test suite: `pytest core/ -v`.
3. Do not bypass the `quantum_atropos.py` safety constraints.
4. Issue that pull request!

## Architecture Philosophy
Please read `README.md` carefully. Ensure your PR does not turn the decentralized agents into a monolith. Each agent must remain completely stateless and isolated, operating solely over the `event_bus.py`.
