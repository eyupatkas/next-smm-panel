import { db } from "@/lib/db";

export type SafeJobRun = {
  id: string;
  jobName: string;
  status: string;
  trigger: string;
  scanned: number;
  synced: number;
  sent: number;
  failures: number;
  refundedTotal: number;
  details: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

type JobRunCreateInput = {
  jobName: string;
  status: string;
  trigger: string;
  scanned: number;
  synced: number;
  sent: number;
  failures: number;
  refundedTotal: number;
  details?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
};

type JobRunFindManyArgs = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  take?: number;
};

function getJobRunDelegate() {
  return (db as unknown as {
    jobRun?: {
      create: (args: { data: JobRunCreateInput }) => Promise<unknown>;
      findMany: (args: JobRunFindManyArgs) => Promise<SafeJobRun[]>;
    };
  }).jobRun;
}

export async function createJobRunSafe(data: JobRunCreateInput) {
  const delegate = getJobRunDelegate();
  if (!delegate?.create) return null;

  return delegate.create({ data });
}

export async function findJobRunsSafe(args: JobRunFindManyArgs) {
  const delegate = getJobRunDelegate();
  if (!delegate?.findMany) return [] as SafeJobRun[];

  return delegate.findMany(args);
}

export function hasJobRunModel() {
  return Boolean(getJobRunDelegate());
}