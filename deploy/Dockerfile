FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir flask>=3.0
COPY license_server.py update_server.py owner_saas_dashboard.py ./
EXPOSE 5055 5056 5060
CMD ["python", "license_server.py"]
