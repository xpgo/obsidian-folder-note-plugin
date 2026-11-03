import { App, TFile } from 'obsidian';

declare global {
    interface Window {
        ExcalidrawAutomate?: any;
    }
}

export function isExcalidrawFile(file: TFile, app: App): boolean {
    if (file.extension === 'excalidraw') {
        return true;
    }
    if (file.extension === 'md') {
        const cache = app.metadataCache.getFileCache(file);
        return Boolean(cache?.frontmatter?.['excalidraw-plugin']);
    }
    return false;
}

export async function generateExcalidrawSvgMarkup(app: App, file: TFile): Promise<string | null> {
    if (!window.ExcalidrawAutomate) {
        return null;
    }
    try {
        const ea = window.ExcalidrawAutomate;
        ea.reset();
        const svgElement: SVGSVGElement = await ea.createSVG(file.path);
        if (svgElement) {
            svgElement.removeAttribute('width');
            svgElement.removeAttribute('height');
            svgElement.style.width = '100%';
            svgElement.style.height = '100%';
            svgElement.style.objectFit = 'contain';
            return svgElement.outerHTML;
        }
    } catch (error) {
        console.error(`Failed to render Excalidraw preview for ${file.path}`, error);
    }
    return null;
}