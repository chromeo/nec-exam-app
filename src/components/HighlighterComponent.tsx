import React, { useEffect, useRef, useCallback } from 'react';
import { HighlightData } from '../hooks/useExam';

interface HighlighterComponentProps {
  children: React.ReactNode;
  containerId: string;
  isHighlighterActive: boolean;
  highlights: HighlightData[];
  onAddHighlight: (highlight: HighlightData) => void;
  className?: string;
}

export const HighlighterComponent: React.FC<HighlighterComponentProps> = ({
  children,
  containerId,
  isHighlighterActive,
  highlights,
  onAddHighlight,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (!isHighlighterActive || !containerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();
    
    if (!selectedText) return;

    // Check if selection is within our container
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    // Get the text content of the container to calculate proper offsets
    const containerText = containerRef.current.textContent || '';
    
    // Calculate offset based on position in the text content
    let startOffset = 0;
    let endOffset = 0;
    
    try {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(containerRef.current);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      startOffset = preCaretRange.toString().length;
      endOffset = startOffset + selectedText.length;
    } catch (error) {
      console.warn('Error calculating highlight offsets:', error);
      return;
    }

    // Create highlight data
    const highlightData: HighlightData = {
      id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: selectedText,
      startOffset,
      endOffset,
      containerId
    };

    onAddHighlight(highlightData);
    selection.removeAllRanges();
  }, [isHighlighterActive, containerId, onAddHighlight]);

  const applyHighlights = useCallback(() => {
    if (!containerRef.current) return;

    const containerHighlights = highlights.filter(h => h.containerId === containerId);
    if (!containerHighlights.length) return;

    // Get all text nodes in the container
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node as Text);
    }

    // Calculate cumulative text content
    let textOffset = 0;
    const nodeOffsets: { node: Text; start: number; end: number }[] = [];
    
    textNodes.forEach(textNode => {
      const textLength = textNode.textContent?.length || 0;
      nodeOffsets.push({
        node: textNode,
        start: textOffset,
        end: textOffset + textLength
      });
      textOffset += textLength;
    });

    // Sort highlights by start position (descending) to apply them from end to start
    const sortedHighlights = [...containerHighlights].sort((a, b) => b.startOffset - a.startOffset);

    sortedHighlights.forEach(highlight => {
      // Find which text nodes contain this highlight
      nodeOffsets.forEach(({ node, start, end }) => {
        const nodeText = node.textContent || '';
        
        // Check if this highlight intersects with this text node
        if (highlight.startOffset < end && highlight.endOffset > start) {
          const relativeStart = Math.max(0, highlight.startOffset - start);
          const relativeEnd = Math.min(nodeText.length, highlight.endOffset - start);
          
          if (relativeStart < relativeEnd) {
            // Split the text node and wrap the highlighted part
            const beforeText = nodeText.substring(0, relativeStart);
            const highlightedText = nodeText.substring(relativeStart, relativeEnd);
            const afterText = nodeText.substring(relativeEnd);
            
            // Create the highlighted element
            const mark = document.createElement('mark');
            mark.className = 'exam-highlight';
            mark.textContent = highlightedText;
            
            // Replace the text node with the new structure
            const parent = node.parentNode;
            if (parent) {
              if (beforeText) {
                parent.insertBefore(document.createTextNode(beforeText), node);
              }
              parent.insertBefore(mark, node);
              if (afterText) {
                parent.insertBefore(document.createTextNode(afterText), node);
              }
              parent.removeChild(node);
            }
          }
        }
      });
    });
  }, [highlights, containerId]);

  const removeHighlights = useCallback(() => {
    if (!containerRef.current) return;

    const highlightElements = containerRef.current.querySelectorAll('.exam-highlight');
    highlightElements.forEach(element => {
      const parent = element.parentNode;
      const textContent = element.textContent || '';
      if (parent) {
        parent.replaceChild(document.createTextNode(textContent), element);
      }
    });

    // Normalize text nodes to merge adjacent text nodes
    if (containerRef.current.normalize) {
      containerRef.current.normalize();
    }
  }, []);

  useEffect(() => {
    removeHighlights();
    setTimeout(() => applyHighlights(), 0);
  }, [highlights, removeHighlights, applyHighlights]);

  // Allow button clicks when highlighter is active - only prevent if actually selecting text
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isHighlighterActive) {
      // Only prevent default if there is actually selected text
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, [isHighlighterActive]);

  return (
    <div
      ref={containerRef}
      className={`${className} ${isHighlighterActive ? 'highlighter-cursor' : ''}`}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      style={{
        userSelect: isHighlighterActive ? 'text' : 'auto'
      }}
      suppressHydrationWarning
    >
      {children}
    </div>
  );
};