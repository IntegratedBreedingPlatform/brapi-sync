// TODO brapi-js catch errors
export function brapiCatch(brapi: any, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    brapi.all(() => resolve());
    setTimeout(reject, timeout);
  });
}
