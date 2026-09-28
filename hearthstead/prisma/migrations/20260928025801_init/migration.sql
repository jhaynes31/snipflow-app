-- CreateEnum
CREATE TYPE "Team" AS ENUM ('leadership', 'marketing', 'dev', 'custom');

-- CreateEnum
CREATE TYPE "ModelTier" AS ENUM ('fast', 'smart');

-- CreateEnum
CREATE TYPE "Shift" AS ENUM ('day', 'night', 'always');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('sleeping', 'idle', 'walking', 'working', 'waiting_review', 'handing_off', 'blocked', 'celebrating');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'paused', 'killed');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('planning', 'running', 'needs_review', 'done', 'failed', 'blocked');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('queued', 'in_progress', 'needs_review', 'approved', 'rejected', 'done', 'failed', 'blocked');

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('plan', 'work');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "avatarSpriteKey" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "skills" TEXT[],
    "tools" TEXT[],
    "model" "ModelTier" NOT NULL,
    "dailyTokenBudget" INTEGER NOT NULL,
    "shift" "Shift" NOT NULL DEFAULT 'always',
    "status" "AgentStatus" NOT NULL DEFAULT 'idle',
    "currentTaskId" TEXT,
    "styleNotes" TEXT NOT NULL DEFAULT '',
    "tasksDone" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "brandKit" JSONB NOT NULL DEFAULT '{}',
    "monthlyBudgetCap" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "approvalLock" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'planning',
    "createdBy" TEXT NOT NULL DEFAULT 'me',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "TaskKind" NOT NULL DEFAULT 'work',
    "planKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT 'me',
    "status" "TaskStatus" NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "dependsOn" TEXT[],
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxSteps" INTEGER NOT NULL DEFAULT 8,
    "maxTokens" INTEGER NOT NULL DEFAULT 20000,
    "lastError" TEXT,
    "reviewNotes" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskStep" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "agentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEntry" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,

    CONSTRAINT "UsageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "agentId" TEXT,
    "taskId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "dailyCapUsd" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "monthlyCapUsd" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "autoApprovePlans" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Task_goalId_planKey_key" ON "Task"("goalId", "planKey");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStep_taskId_attempt_step_key" ON "TaskStep"("taskId", "attempt", "step");

-- CreateIndex
CREATE UNIQUE INDEX "Deliverable_taskId_attempt_key" ON "Deliverable"("taskId", "attempt");

-- CreateIndex
CREATE INDEX "UsageEntry_createdAt_idx" ON "UsageEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEntry_taskId_attempt_step_key" ON "UsageEntry"("taskId", "attempt", "step");

-- CreateIndex
CREATE INDEX "AgentEvent_createdAt_idx" ON "AgentEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEntry" ADD CONSTRAINT "UsageEntry_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEntry" ADD CONSTRAINT "UsageEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
