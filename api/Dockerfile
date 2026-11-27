# Contexto de build: raiz do repositório (a API usa lab/ e data/publicado/)
FROM python:3.12-slim
WORKDIR /srv
COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt
COPY lab ./lab
COPY api ./api
COPY data ./data
# Memória: o pool do Arrow (mimalloc/jemalloc) e as arenas do glibc seguravam ~125 MB que o
# Render contava contra o limite de 512 MB. Com o alocador do sistema a API cabe com folga.
ENV PORT=8000 \
    ARROW_DEFAULT_MEMORY_POOL=system \
    MALLOC_ARENA_MAX=2
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
