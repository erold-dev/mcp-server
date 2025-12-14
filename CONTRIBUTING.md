# Contributing to Erold MCP Server

Thank you for your interest in contributing to the Erold MCP Server! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/mcp-server.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit

# Build
npm run build

# Run locally
npm start
```

## Testing with AI Assistants

To test your changes with Claude or other MCP-compatible assistants:

1. Build the project: `npm run build`
2. Update your MCP configuration to point to your local build
3. Restart your AI assistant

## Pull Request Process

1. Ensure all tests pass before submitting
2. Run type checking: `npx tsc --noEmit`
3. Update documentation if needed
4. Follow the existing code style
5. Write meaningful commit messages
6. Link any related issues in your PR description

## Code Style

- Use TypeScript with strict mode
- Follow existing patterns in the codebase
- Add types for all function parameters and return values
- Write descriptive variable and function names

## Reporting Bugs

Use the bug report template when creating issues. Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, AI assistant used)

## Questions?

Feel free to open an issue for questions or reach out at contact@erold.dev.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
