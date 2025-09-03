export function getFileTypeDisplay(mimeType: string, fileName: string = ''): string {
    if (fileName) {
        const lastDotPos = fileName.lastIndexOf('.');
        if (lastDotPos !== -1) {
            const extension = fileName.substring(lastDotPos);
            if (extension) {
                return extension.toUpperCase().replace('.', '') + ' File';
            }
        }
    }

    const mimeTypes: { [key: string]: string } = {
        'application/pdf': 'PDF',
        'application/vnd.google-apps.document': 'Google Doc',
        'application/vnd.google-apps.spreadsheet': 'Google Sheet',
        'application/vnd.google-apps.presentation': 'Google Slides',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
        'text/plain': 'Text File',
        'image/jpeg': 'JPEG Image',
        'image/png': 'PNG Image',
        'image/gif': 'GIF Image',
        'application/zip': 'ZIP Archive',
        'application/x-rar-compressed': 'RAR Archive',
        'application/vnd.rar': 'RAR Archive'
    };

    return mimeTypes[mimeType] || 'Unknown File Type';
}

export function formatFileSize(bytes: number | string | null | undefined): string {
    if (bytes === null || bytes === undefined) return 'N/A';

    let numericBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
    if (isNaN(numericBytes)) return 'N/A';

    const units = ['B', 'KB', 'MB', 'GB'];
    numericBytes = Math.max(numericBytes, 0);
    const pow = Math.floor((numericBytes ? Math.log(numericBytes) : 0) / Math.log(1024));
    const powIndex = Math.min(pow, units.length - 1);
    numericBytes /= Math.pow(1024, powIndex);

    return Math.round(numericBytes * 100) / 100 + ' ' + units[powIndex];
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
