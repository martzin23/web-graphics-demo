PORT ?= 8000
PY := python3

.PHONY: run
run:
	@echo "Serving $(shell pwd) on http://localhost:$(PORT)"
	$(PY) -m http.server $(PORT)
