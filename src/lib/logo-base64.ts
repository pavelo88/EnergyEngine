// This file stores the company logo as a Base64 string.
// This ensures that the logo can be embedded into PDFs even when the user is offline,
// as it doesn't require a network request to fetch the image.
// A valid 1x1 transparent PNG is used to prevent PDF generation errors.

export const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
