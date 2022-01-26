export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const retryNTimes = async (toTry: Promise<any>, times = 3, intervalInMs = 1000) => {
  if (times < 1) {
    throw new Error(`Bad argument: 'times' must be greater than 0, but ${times} was received.`);
  }
  let attemptCount = 0;
  while (attemptCount < times) {
    try {
      attemptCount++;
      return await toTry;
    } catch (error) {
      if (attemptCount >= times) {
        throw error;
      }
    }
    await sleep(intervalInMs);
  }
  throw new Error(`Failed to obtain result after ${times} retries`);
};
