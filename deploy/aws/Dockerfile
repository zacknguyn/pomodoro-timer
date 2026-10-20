# Build native dependencies for the actual Lambda OS and architecture.
FROM public.ecr.aws/lambda/nodejs:24
COPY backend/package.json backend/package-lock.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --omit=dev && npm cache clean --force
COPY backend/src ${LAMBDA_TASK_ROOT}/src
COPY backend/schema.sql ${LAMBDA_TASK_ROOT}/schema.sql
COPY backend/migrations ${LAMBDA_TASK_ROOT}/migrations
CMD ["src/lambdas/app.handler"]
