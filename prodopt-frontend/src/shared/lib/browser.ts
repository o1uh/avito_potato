// src/shared/lib/browser.ts
export const browser = {
  location: {
    assign: (url: string) => window.location.assign(url),
  },
};