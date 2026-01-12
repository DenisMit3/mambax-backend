import '@testing-library/jest-dom'
// Polyfills if needed
import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock IntersectionObserver
class IntersectionObserver {
    observe() { return null }
    unobserve() { return null }
    disconnect() { return null }
}
global.IntersectionObserver = IntersectionObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({}),
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(""),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
    })
);
