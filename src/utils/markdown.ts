/**
 * Simple markdown parser for basic formatting
 * Supports: headings (# ## ###), **bold**, *italic*, bullet points, numbered lists, links, and line breaks
 */
export function parseMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  // Escape HTML to prevent XSS
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert headings (must be done first, line by line)
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let inOrderedList = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmedLine = line.trim();
    
    // Check for headings at start of line
    if (trimmedLine.match(/^#{1,6}\s+/)) {
      // Close any open lists
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        const fontSize = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
        const marginTop = level <= 2 ? 'mt-4' : 'mt-3';
        const marginBottom = level <= 2 ? 'mb-2' : 'mb-1';
        processedLines.push(`<h${level} class="${fontSize} font-semibold ${marginTop} ${marginBottom} first:mt-0">${content}</h${level}>`);
        continue;
      }
    }
    
    // Check for numbered lists
    if (trimmedLine.match(/^\d+\.\s+/)) {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (!inOrderedList) {
        processedLines.push('<ol class="list-decimal list-inside space-y-1 ml-4">');
        inOrderedList = true;
      }
      const content = trimmedLine.replace(/^\d+\.\s+/, '');
      processedLines.push(`<li>${content}</li>`);
      continue;
    }
    
    // Check for bullet points
    if (trimmedLine.match(/^[-*]\s+/)) {
      if (inOrderedList) {
        processedLines.push('</ol>');
        inOrderedList = false;
      }
      if (!inList) {
        processedLines.push('<ul class="list-disc list-inside space-y-1 ml-4">');
        inList = true;
      }
      const content = trimmedLine.replace(/^[-*]\s+/, '');
      processedLines.push(`<li>${content}</li>`);
      continue;
    }
    
    // Not a special line
    if (inList) {
      processedLines.push('</ul>');
      inList = false;
    }
    if (inOrderedList) {
      processedLines.push('</ol>');
      inOrderedList = false;
    }
    
    if (trimmedLine === '') {
      // Empty line becomes paragraph break
      processedLines.push('<br>');
    } else {
      // Regular line
      processedLines.push(line);
    }
  }
  
  // Close any open lists
  if (inList) {
    processedLines.push('</ul>');
  }
  if (inOrderedList) {
    processedLines.push('</ol>');
  }
  
  // Join lines
  html = processedLines.join('\n');
  
  // Convert **bold** text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* text (avoid conflict with bold)
  html = html.replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Convert [link text](url) links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert `code` inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  
  // Convert double line breaks to paragraph breaks
  html = html.replace(/\n\n/g, '</p><p class="mb-2">');
  
  // Wrap in paragraph tags if content exists and doesn't start with a block element
  if (html && !html.match(/^<(?:h[1-6]|ul|ol|br)/)) {
    html = `<p class="mb-2">${html}</p>`;
  }
  
  // Clean up any empty paragraphs
  html = html.replace(/<p class="mb-2"><\/p>/g, '');
  
  return html;
}

/**
 * Strip markdown formatting for plain text display
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  return markdown
    .replace(/^#{1,6}\s+/gm, '')       // Remove heading markers
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold
    .replace(/\*(.*?)\*\*/g, '$1')     // Remove italic  
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Remove links, keep text
    .replace(/`([^`]+)`/g, '$1')      // Remove inline code
    .replace(/^[-*]\s+/gm, '• ')      // Convert bullets to simple bullets
    .replace(/^\d+\.\s+/gm, '• ')     // Convert numbered lists to bullets
    .trim();
}