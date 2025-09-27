.PHONY: help dev-start dev-stop dev-ready dev-clear logs test smoke sync-import sync-push conflicts db-backup oauth prod front-dev front-build docker-up docker-down docker-logs docker-start docker-rebuild-backend docker-rebuild-frontend e2e e2e-headed dev-db-wipe docker-db-wipe gcal-clear-range gcal-clear-all wipe-reservations db-info db-optimize release-zip db-checkpoint db-integrity db-maintenance

.ONESHELL:
SHELL := /bin/sh

-include .env

HOST ?= 127.0.0.1
PORT ?= 8776
BASE ?= http://$(HOST):$(PORT)
API_KEY ?= dev-key
FAKE ?= 0
# Ruta unificada por defecto
DB_PATH ?= backend/data/pelubot.db
# Directorio para backups locales
BACKUPS_DIR ?= backups
GOOGLE_OAUTH_JSON ?= oauth_tokens.json
# Auto-detect Docker Compose (v2 plugin preferred, fallback to v1)
# You can still override: make DOCKER=docker-compose docker-up
DOCKER ?= $(shell if docker compose version >/dev/null 2>&1; then echo 'docker compose'; \
                   elif command -v docker-compose >/dev/null 2>&1; then echo 'docker-compose'; \
                   else echo 'docker compose'; fi)

help:
	@echo "Targets:"
	@echo "  make dev-start   # start uvicorn on $(BASE)"
	@echo "  make dev-stop    # stop uvicorn"
	@echo "  make dev-ready   # wait /ready"
	@echo "  make dev-clear   # clear calendars via admin API"
	@echo "  make dev-demo    # clear calendars and create demo reservation"
	@echo "  make test        # run backend tests"
	@echo "  make logs        # tail backend/server2.log"
	@echo "  make smoke       # end-to-end flow: create->reschedule->cancel->sync"
	@echo "  make sync-import # import GCAL -> DB (vars: START, END, DAYS)"
	@echo "  make sync-push   # push DB -> GCAL (vars: START, END, DAYS)"
	@echo "  make conflicts   # detect conflicts (vars: START, END, DAYS)"
	@echo "  make db-info     # print DB info (/admin/db_info)"
	@echo "  make db-optimize # run VACUUM/ANALYZE (/admin/db_optimize)"
	@echo "  make db-backup   # copy DB with timestamp to $(BACKUPS_DIR)/"
	@echo "  make db-checkpoint # PRAGMA wal_checkpoint(TRUNCATE)"
	@echo "  make db-integrity # PRAGMA integrity_check"
	@echo "  make db-maintenance # backup -> checkpoint -> integrity -> optimize"
	@echo "  make oauth       # run OAuth flow to capture token"
	@echo "  make prod        # run uvicorn with 2 workers on $(BASE)"
	@echo "  make front-dev   # run Vite dev server"
	@echo "  make front-build # build frontend"
	@echo "  make docker-up   # build & run backend+frontend with Docker"
	@echo "  make docker-down # stop and remove containers/volumes"
	@echo "  make docker-logs # tail docker compose logs"
	@echo "  make docker-start # up without --build"
	@echo "  make docker-rebuild-backend  # rebuild only backend"
	@echo "  make docker-rebuild-frontend # rebuild only frontend"
	@echo "  make docker-dev   # run backend + frontend-dev (Vite) on :8080"
	@echo "  make docker-prod  # rebuild frontend (no cache) and run prod"
	@echo "  make docker-rebuild # force rebuild frontend image (no cache)"
	@echo "  make e2e         # run Playwright tests (headless)"
	@echo "  make e2e-headed  # run Playwright headed (debug)"
	@echo "  make dev-db-wipe # remove dev SQLite DB"
	@echo "  make docker-db-wipe # remove Docker DB volume"
	@echo "  make gcal-clear-range # clear Google Calendar events by range"
	@echo "  make gcal-clear-all # clear all Google Calendar events"
	@echo "  make gcal-clean-orphans # delete orphan GCal events (dry-run by default)"
	@echo "  make wipe-reservations # remove all reservations in DB"
	@echo "  make release-zip # crea pelubot-release.zip limpio (con .env.example)"

dev-start:
	cd backend && \
	( [ -f uvicorn2.pid ] && kill $$(cat uvicorn2.pid) 2>/dev/null || true ) && \
	( command -v fuser >/dev/null && fuser -k $(PORT)/tcp >/dev/null 2>&1 || true ) && \
	API_KEY=$(API_KEY) AUTO_SYNC_FROM_GCAL=false PELUBOT_FAKE_GCAL=$(FAKE) GOOGLE_OAUTH_JSON=$(GOOGLE_OAUTH_JSON) DATABASE_URL=sqlite:///$$PWD/../$(DB_PATH) \
		nohup uvicorn app.main:app --host $(HOST) --port $(PORT) --log-level warning > server2.log 2>&1 & echo $$! > uvicorn2.pid

dev-stop:
	cd backend && \
	( [ -f uvicorn2.pid ] && kill $$(cat uvicorn2.pid) 2>/dev/null || true ) && \
	( command -v fuser >/dev/null && fuser -k $(PORT)/tcp >/dev/null 2>&1 || true )

dev-ready:
	@for i in $$(seq 1 50); do \
		out=$$(curl -s $(BASE)/ready || true); \
		echo $$out | grep -E -q '"ok":\s*(true|false)' && { echo $$out; exit 0; }; \
		sleep 0.2; \
	done; \
	echo "timeout waiting for $(BASE)/ready"; tail -n 50 backend/server2.log; exit 1

dev-clear: dev-ready
	@echo "Clearing calendars via admin API..."
	BASE=$(BASE) API_KEY=$(API_KEY) python backend/scripts/dev_demo.py --clear-only

dev-demo: dev-start dev-ready
	@echo "Running demo: clear calendars + create reservation + check conflicts"
	sleep 0.3
	BASE=$(BASE) API_KEY=$(API_KEY) CLEAR_ALL=true python backend/scripts/dev_demo.py
	@echo "Done."

test:
	cd backend && PYTEST_ADDOPTS=-q PELUBOT_FAKE_GCAL=1 pytest

logs:
	tail -n 100 -f backend/server2.log

smoke: dev-start dev-ready
	@echo "Running smoke flow (create -> reschedule -> cancel -> sync)..."
	BASE=$(BASE) API_KEY=$(API_KEY) python backend/scripts/smoke_flow.py

sync-import:
		@echo "Sync import $(or $(START),today) .. $(or $(END),+$(or $(DAYS),7)d)"
		BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ['BASE']; API_KEY=os.environ['API_KEY']
	START=os.environ.get('START'); END=os.environ.get('END'); DAYS=os.environ.get('DAYS')
	body={'mode':'import'}
	if START: body['start']=START
	if END: body['end']=END
	if DAYS: body['days']=int(DAYS)
	req=request.Request(BASE+'/admin/sync', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json'); req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

sync-push:
		@echo "Sync push $(or $(START),today) .. $(or $(END),+$(or $(DAYS),7)d)"
		BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ['BASE']; API_KEY=os.environ['API_KEY']
	START=os.environ.get('START'); END=os.environ.get('END'); DAYS=os.environ.get('DAYS')
	body={'mode':'push'}
	if START: body['start']=START
	if END: body['end']=END
	if DAYS: body['days']=int(DAYS)
	req=request.Request(BASE+'/admin/sync', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json'); req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

sync-both:
		@echo "Sync both $(or $(START),today) .. $(or $(END),+$(or $(DAYS),7)d)"
		BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ['BASE']; API_KEY=os.environ['API_KEY']
	START=os.environ.get('START'); END=os.environ.get('END'); DAYS=os.environ.get('DAYS')
	body={'mode':'both'}
	if START: body['start']=START
	if END: body['end']=END
	if DAYS: body['days']=int(DAYS)
	req=request.Request(BASE+'/admin/sync', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json'); req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

conflicts:
		@echo "Conflicts for range"
		BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ['BASE']; API_KEY=os.environ['API_KEY']
	START=os.environ.get('START'); END=os.environ.get('END'); DAYS=os.environ.get('DAYS')
	body={}
	if START: body['start']=START
	if END: body['end']=END
	if DAYS: body['days']=int(DAYS)
	req=request.Request(BASE+'/admin/conflicts', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json'); req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

db-backup:
	@ts=$$(date +%Y%m%d-%H%M%S); \
	if [ -f "$(DB_PATH)" ]; then \
	  mkdir -p "$(BACKUPS_DIR)"; \
	  cp "$(DB_PATH)" "$(BACKUPS_DIR)/pelubot-$${ts}.db"; \
	  echo "Backup created: $(BACKUPS_DIR)/pelubot-$${ts}.db"; \
	else \
	  echo "DB not found at $(DB_PATH). Set DB_PATH or create DB (make dev-start)."; exit 1; \
	fi

# Ejecuta WAL checkpoint (TRUNCATE) en SQLite (vía CLI si está disponible; fallback a endpoint)
db-checkpoint:
	@if command -v sqlite3 >/dev/null 2>&1; then \
	  sqlite3 "$(DB_PATH)" "PRAGMA wal_checkpoint(TRUNCATE);"; \
	else \
	  echo "sqlite3 no encontrado; usando endpoint /admin/db_checkpoint"; \
	  BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY' \
	import os,json; from urllib import request; BASE=os.environ['BASE']; API_KEY=os.environ['API_KEY']; \
	req=request.Request(BASE+'/admin/db_checkpoint', data=b'{}', method='POST'); req.add_header('Content-Type','application/json'); req.add_header('X-API-Key',API_KEY); \
	print(request.urlopen(req, timeout=12).read().decode()); PY; \
	fi

# Integridad de BD vía PRAGMA integrity_check
db-integrity:
	@if command -v sqlite3 >/dev/null 2>&1; then \
	  sqlite3 "$(DB_PATH)" "PRAGMA integrity_check;"; \
	else \
	  echo "sqlite3 no encontrado; usando endpoint /admin/db_integrity"; \
	  BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY' \
	import os; from urllib import request; BASE=os.environ['BASE']; API_KEY=os.environ['API_KEY']; \
	req=request.Request(BASE+'/admin/db_integrity'); req.add_header('X-API-Key',API_KEY); \
	print(request.urlopen(req, timeout=12).read().decode()); PY; \
	fi

# Mantenimiento completo: backup -> checkpoint -> integrity -> optimize
db-maintenance: db-backup db-checkpoint db-integrity db-optimize
	@echo "Mantenimiento completo OK"

# Migra la BD antigua dev-pelubot-sync.db -> pelubot.db si no existe
migrate-db:
	@if [ ! -f backend/data/pelubot.db ] && [ -f backend/data/dev-pelubot-sync.db ]; then \
	  cp backend/data/dev-pelubot-sync.db backend/data/pelubot.db; echo "Migrado backend/data/dev-pelubot-sync.db -> backend/data/pelubot.db"; \
	else \
	  echo "Nada que migrar (pelubot.db existe o no hay dev-pelubot-sync.db)"; \
	fi

oauth:
	cd backend && python scripts/oauth.py

prod: dev-stop
	cd backend && \
	API_KEY=$(API_KEY) AUTO_SYNC_FROM_GCAL=false PELUBOT_FAKE_GCAL=$(FAKE) GOOGLE_OAUTH_JSON=$(GOOGLE_OAUTH_JSON) DATABASE_URL=sqlite:///$$PWD/../$(DB_PATH) \
		nohup uvicorn app.main:app --host $(HOST) --port $(PORT) --workers 2 --log-level info > server2.log 2>&1 & echo $$! > uvicorn2.pid
	@$(MAKE) dev-ready PORT=$(PORT)

front-dev:
	cd Frontend/shadcn-ui && pnpm i && pnpm dev

front-build:
	cd Frontend/shadcn-ui && pnpm i && pnpm build

docker-up:
	$(DOCKER) up --build -d
	@echo "Backend: http://localhost:$${BACKEND_PORT:-8776} | Frontend: http://localhost:$${FRONTEND_PORT:-8080}"

docker-down:
	$(DOCKER) down -v

docker-logs:
	$(DOCKER) logs -f --tail=200

docker-start:
	$(DOCKER) up -d
	@echo "Backend: http://localhost:$${BACKEND_PORT:-8776} | Frontend: http://localhost:$${FRONTEND_PORT:-8080}"

docker-rebuild-backend:
	$(DOCKER) up -d --no-deps --build backend

docker-rebuild-frontend:
	$(DOCKER) up -d --no-deps --build frontend

docker-dev:
	# Stop prod frontend if running to free :8080
	-$(DOCKER) stop frontend >/dev/null 2>&1 || true
	$(DOCKER) up -d backend frontend-dev
	@echo "Dev en marcha: http://localhost:$${FRONTEND_PORT:-8080} (Vite)"

docker-prod:
	# Stop dev frontend if running
	-$(DOCKER) stop frontend-dev >/dev/null 2>&1 || true
	$(DOCKER) build backend
	$(DOCKER) build --no-cache frontend
	$(DOCKER) up -d backend frontend
	@echo "Prod en marcha: http://localhost:$${FRONTEND_PORT:-8080} (nginx)"

docker-rebuild:
	$(DOCKER) build --no-cache frontend
	$(DOCKER) up -d frontend

e2e:
	# Ensure app is up before running E2E (prefer start to avoid recreate on compose v1)
	-$(DOCKER) start backend frontend >/dev/null 2>&1 || $(DOCKER) up -d backend frontend
	$(DOCKER) run --rm e2e

e2e-headed:
 	# Run headed (opens browser in container with xvfb) and keeps artifacts
	-$(DOCKER) start backend frontend >/dev/null 2>&1 || $(DOCKER) up -d backend frontend
	$(DOCKER) run --rm -e PWDEBUG=console e2e npx playwright test --headed

dev-db-wipe:
	@echo "Removing dev SQLite DBs ..."
	@rm -f backend/data/dev-pelubot-sync.db || true
	@rm -f backend/dev-pelubot-sync.db || true
	@rm -f backend/data/pelubot.db || true
	@echo "Done. Next: make dev-start"

# Borra solo el volumen de BD de docker (pelubot_db); no toca imágenes
# Úsalo cuando quieras resetear la BD en prod sin rehacer imágenes
# Luego: make docker-prod
docker-db-wipe:
	-$(DOCKER) stop backend >/dev/null 2>&1 || true
	-$(DOCKER) rm backend >/dev/null 2>&1 || true
	docker volume rm pelubot_db || true
	@echo "Volumen de BD eliminado (pelubot_db). Siguiente: make docker-prod"

# Limpia Google Calendar por rango usando /admin/clear_calendars
# Variables:
#  START=YYYY-MM-DD  END=YYYY-MM-DD  (opcional)
#  ONLY_PELUBOT=1    # solo eventos creados por Pelubot
#  DRY_RUN=0         # 0 = borrar realmente (requiere confirm=DELETE)
#  BY_PRO=1          # por calendarios de profesionales (por defecto)
# Ejemplos:
#  make gcal-clear-range START=2025-01-01 END=2025-06-30 ONLY_PELUBOT=1 DRY_RUN=0

gcal-clear-range:
	@echo "Clearing GCal range via admin API..."
	BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ.get('BASE','http://127.0.0.1:8776')
	API_KEY=os.environ.get('API_KEY','dev-key')
	START=os.environ.get('START')
	END=os.environ.get('END')
	ONLY=os.environ.get('ONLY_PELUBOT','0') in ('1','true','yes','y','si','sí')
	DRY=os.environ.get('DRY_RUN','1') in ('1','true','yes','y','si','sí')
	BY_PRO=os.environ.get('BY_PRO','1') in ('1','true','yes','y','si','sí')
	body={
	  'by_professional': BY_PRO,
	  'only_pelubot': ONLY,
	  'dry_run': DRY,
	}
	if START: body['start']=START
	if END: body['end']=END
	if not DRY: body['confirm']='DELETE'
	req=request.Request(BASE+'/admin/clear_calendars', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json')
	req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

# Limpia TODOS los eventos de todos los calendarios configurados (PELIGRO)
# Úsalo con cuidado. Puedes limitar con START/END.
# Ejemplo:
#  make gcal-clear-all START=2025-01-01 END=2025-12-31

gcal-clear-all:
	@echo "Clearing ALL events in configured calendars via admin API (confirm=DELETE)..."
	BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ.get('BASE','http://127.0.0.1:8776')
	API_KEY=os.environ.get('API_KEY','dev-key')
	START=os.environ.get('START')
	END=os.environ.get('END')
	body={'by_professional': True,'only_pelubot': False,'dry_run': False,'confirm':'DELETE'}
	if START: body['start']=START
	if END: body['end']=END
	req=request.Request(BASE+'/admin/clear_calendars', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json')
	req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

# Borra eventos huérfanos en GCal (extendedProperties.private.reservation_id sin fila en BD)
# Variables similares a gcal-clear-range (START, END, BY_PRO, DRY_RUN)
gcal-clean-orphans:
	@echo "Cleaning orphaned Pelubot events via admin API..."
	BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ.get('BASE','http://127.0.0.1:8776')
	API_KEY=os.environ.get('API_KEY','dev-key')
	START=os.environ.get('START')
	END=os.environ.get('END')
	DRY=os.environ.get('DRY_RUN','1') in ('1','true','yes','y','si','sí')
	BY_PRO=os.environ.get('BY_PRO','1') in ('1','true','yes','y','si','sí')
	body={'by_professional': BY_PRO,'dry_run': DRY}
	if START: body['start']=START
	if END: body['end']=END
	if not DRY: body['confirm']='DELETE'
	req=request.Request(BASE+'/admin/cleanup_orphans', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json')
	req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

wipe-reservations:
	@echo "Wiping ALL reservations in DB via admin API (confirm=DELETE)..."
	BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ.get('BASE','http://127.0.0.1:8776')
	API_KEY=os.environ.get('API_KEY','dev-key')
	body={'confirm':'DELETE'}
	req=request.Request(BASE+'/admin/wipe_reservations', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json')
	req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

db-info:
	@echo "DB info via /admin/db_info"
	BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ.get('BASE','http://127.0.0.1:8776')
	API_KEY=os.environ.get('API_KEY','dev-key')
	req=request.Request(BASE+'/admin/db_info')
	req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

db-optimize:
	@echo "Optimizing DB via /admin/db_optimize (VACUUM/ANALYZE/PRAGMA optimize)"
	BASE=$(BASE) API_KEY=$(API_KEY) python - <<- 'PY'
	import os,json
	from urllib import request
	BASE=os.environ.get('BASE','http://127.0.0.1:8776')
	API_KEY=os.environ.get('API_KEY','dev-key')
	body={'vacuum': True, 'analyze': True, 'optimize': True}
	req=request.Request(BASE+'/admin/db_optimize', data=json.dumps(body).encode(), method='POST')
	req.add_header('Content-Type','application/json')
	req.add_header('X-API-Key',API_KEY)
	with request.urlopen(req, timeout=12) as r: print(r.read().decode())
	PY

release-zip:
	@echo "Preparing .env.example"
	@if [ ! -f .env.example ]; then \
	  printf "API_KEY=changeme\nUSE_GCAL_BUSY=true\nPELUBOT_FAKE_GCAL=1\nGOOGLE_OAUTH_JSON=oauth_tokens.json\nDATABASE_URL=sqlite:///backend/data/pelubot.db\n" > .env.example; \
	  echo "Created .env.example"; \
	else echo ".env.example exists"; fi
	@echo "Creando pelubot-release.zip (incluye .env y BD si existen)"
	@if ! command -v zip >/dev/null 2>&1; then echo "zip no instalado"; exit 1; fi
	@zip -r pelubot-release.zip . -x@release.exclude
	@echo "Hecho: pelubot-release.zip"

