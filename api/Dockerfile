# Contexto de build: raiz do repositório (a API usa lab/ e data/publicado/)
FROM python:3.12-slim
WORKDIR /srv
COPY api/requirements.txt api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt
COPY lab ./lab
COPY api ./api
COPY data ./data
ENV PORT=8000
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
