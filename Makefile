.PHONY: help install build watch typecheck lint lint-fix stylelint stylelint-fix format format-check knip test test-watch validate audit lockfile-lint sbom zip clean shell

COMPOSE = docker compose

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install / update npm dependencies
	$(COMPOSE) run --rm install

build: ## Production build
	$(COMPOSE) run --rm build

watch: ## Watch mode (rebuild on file changes)
	$(COMPOSE) run --rm watch

typecheck: ## TypeScript type-checking (tsc --noEmit)
	$(COMPOSE) run --rm typecheck

lint: ## Run ESLint
	$(COMPOSE) run --rm lint

lint-fix: ## Run ESLint with auto-fix
	$(COMPOSE) run --rm lint-fix

stylelint: ## Run Stylelint on CSS files
	$(COMPOSE) run --rm stylelint

stylelint-fix: ## Run Stylelint with auto-fix
	$(COMPOSE) run --rm stylelint-fix

format: ## Format code with Prettier
	$(COMPOSE) run --rm format

format-check: ## Check formatting (CI)
	$(COMPOSE) run --rm format-check

knip: ## Detect dead code / unused deps
	$(COMPOSE) run --rm knip

test: ## Run tests
	$(COMPOSE) run --rm test

test-watch: ## Run tests in watch mode
	$(COMPOSE) run --rm test-watch

validate: ## Full validation (typecheck + lint + format + knip + audit + test + build)
	$(COMPOSE) run --rm validate

audit: ## Security audit of npm dependencies
	$(COMPOSE) run --rm audit

lockfile-lint: ## Validate lockfile integrity (supply-chain security)
	$(COMPOSE) run --rm lockfile-lint

sbom: ## Generate Software Bill of Materials (CycloneDX)
	$(COMPOSE) run --rm sbom

zip: ## Package extension for Chrome Web Store
	$(COMPOSE) run --rm zip

shell: ## Open a bash shell in the container
	$(COMPOSE) run --rm dev sh

clean: ## Remove containers, volumes, dist
	$(COMPOSE) down -v --remove-orphans
	rm -rf dist
