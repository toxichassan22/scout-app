import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand } from '@aws-sdk/client-ec2';
import logger from './logger.js';

export const EC2_GPU_INSTANCE_ID = process.env.EC2_GPU_INSTANCE_ID || 'i-00b3cf16ddd411b8f';
export const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
export const AI_GPU_SERVER_URL = (process.env.AI_GPU_SERVER_URL || 'http://52.21.126.195:8000').replace(/\/+$/, '');

let ec2ClientInstance = null;

function getEc2Client() {
  if (ec2ClientInstance) return ec2ClientInstance;

  const credentials = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
      }
    : undefined;

  ec2ClientInstance = new EC2Client({
    region: AWS_REGION,
    ...(credentials ? { credentials } : {}),
  });
  return ec2ClientInstance;
}

/**
 * Get current EC2 instance state & public IP
 */
export async function getGpuStatus() {
  const instanceId = EC2_GPU_INSTANCE_ID;
  const client = getEc2Client();

  try {
    const command = new DescribeInstancesCommand({
      InstanceIds: [instanceId],
    });
    const response = await client.send(command);
    const reservation = response.Reservations?.[0];
    const instance = reservation?.Instances?.[0];

    if (!instance) {
      return {
        success: false,
        instanceId,
        state: 'unknown',
        error: 'Instance not found in EC2 response',
      };
    }

    const state = instance.State?.Name || 'unknown';
    const publicIp = instance.PublicIpAddress || '52.21.126.195';
    const instanceType = instance.InstanceType || 'g5.xlarge';
    const launchTime = instance.LaunchTime;

    return {
      success: true,
      instanceId,
      state, // 'running' | 'stopped' | 'stopping' | 'pending' | 'shutting-down'
      stateCode: instance.State?.Code,
      publicIp,
      instanceType,
      launchTime,
      region: AWS_REGION,
      apiUrl: AI_GPU_SERVER_URL,
    };
  } catch (err) {
    logger.error({ err, instanceId }, 'Failed to describe EC2 GPU instance');
    return {
      success: false,
      instanceId,
      state: 'error',
      error: err.message || 'Failed to communicate with AWS EC2 API',
      region: AWS_REGION,
      apiUrl: AI_GPU_SERVER_URL,
    };
  }
}

/**
 * Start EC2 GPU instance
 */
export async function startGpuInstance() {
  const instanceId = EC2_GPU_INSTANCE_ID;
  const client = getEc2Client();

  try {
    const command = new StartInstancesCommand({
      InstanceIds: [instanceId],
    });
    const response = await client.send(command);
    const change = response.StartingInstances?.[0];

    logger.info({ instanceId, change }, 'EC2 GPU instance start initiated');
    return {
      success: true,
      message: 'تم إرسال أمر تشغيل سيرفر الـ GPU بنجاح',
      instanceId,
      previousState: change?.PreviousState?.Name,
      currentState: change?.CurrentState?.Name || 'pending',
    };
  } catch (err) {
    logger.error({ err, instanceId }, 'Failed to start EC2 GPU instance');
    throw new Error(err.message || 'فشل تشغيل سيرفر الـ GPU عبر AWS');
  }
}

/**
 * Stop EC2 GPU instance
 */
export async function stopGpuInstance() {
  const instanceId = EC2_GPU_INSTANCE_ID;
  const client = getEc2Client();

  try {
    const command = new StopInstancesCommand({
      InstanceIds: [instanceId],
    });
    const response = await client.send(command);
    const change = response.StoppingInstances?.[0];

    logger.info({ instanceId, change }, 'EC2 GPU instance stop initiated');
    return {
      success: true,
      message: 'تم إرسال أمر إيقاف سيرفر الـ GPU بنجاح',
      instanceId,
      previousState: change?.PreviousState?.Name,
      currentState: change?.CurrentState?.Name || 'stopping',
    };
  } catch (err) {
    logger.error({ err, instanceId }, 'Failed to stop EC2 GPU instance');
    throw new Error(err.message || 'فشل إيقاف سيرفر الـ GPU عبر AWS');
  }
}

/**
 * Check health & readiness of FastAPI server on the GPU instance
 */
export async function checkGpuHealth() {
  const healthUrl = `${AI_GPU_SERVER_URL}/health`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = { status: 'ok' };
      }
      return {
        ready: true,
        status: 'online',
        httpStatus: res.status,
        url: healthUrl,
        data,
      };
    }
    return {
      ready: false,
      status: 'http_error',
      httpStatus: res.status,
      url: healthUrl,
      error: `Server returned HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ready: false,
      status: 'offline',
      url: healthUrl,
      error: err.name === 'AbortError' ? 'Connection timeout' : (err.message || 'Failed to connect to GPU server'),
    };
  }
}
