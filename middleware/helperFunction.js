import { readFile } from 'fs/promises';

export const loadJSON = async ( filePath) => {
  try {
    const data = await readFile(filePath, 'utf-8');
    const json = JSON.parse(data);
    return json;
  } catch (err) {
    return ('Failed to load JSON:', err);
  }
};