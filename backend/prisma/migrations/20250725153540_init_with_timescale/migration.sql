-- FIRST, ACTIVATE THE TIMESCALE EXTENSION
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- CreateTable
CREATE TABLE "Endpoint" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndpointMetric" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "endpointId" INTEGER NOT NULL,

    CONSTRAINT "EndpointMetric_pkey" PRIMARY KEY ("id","timestamp")
);

-- CreateIndex
CREATE UNIQUE INDEX "Endpoint_url_key" ON "Endpoint"("url");

-- CreateIndex
CREATE INDEX "EndpointMetric_timestamp_idx" ON "EndpointMetric"("timestamp");

-- AddForeignKey
ALTER TABLE "EndpointMetric" ADD CONSTRAINT "EndpointMetric_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "Endpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FINALLY, CONVERT TO HYPERTABLE
SELECT create_hypertable('"EndpointMetric"', 'timestamp');