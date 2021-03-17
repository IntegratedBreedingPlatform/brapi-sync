/**
 * Ugly Workaround to catch errors
 * TODO brapi-js catch errors
 * @param brapi the brapi node object
 * @param timeout to reject
 */
export function brapiAll(brapi: any, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    brapi.all((res: any) => resolve(res));
    setTimeout(reject, timeout);
  });
}
