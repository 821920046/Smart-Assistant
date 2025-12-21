import React from 'react';

const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  lines.forEach((line, index) => {
    // Handle Code Blocks
    if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
            // End of code block
            elements.push(
                <pre key={`code-${index}`} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-xs overflow-x-auto my-2 font-mono text-slate-700 dark:text-slate-300">
                    {codeBlockContent.join('\n')}
                </pre>
            );
            codeBlockContent = [];
            inCodeBlock = false;
        } else {
            // Start of code block
            inCodeBlock = true;
        }
        return;
    }

    if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
    }

    // Handle Headers
    if (line.startsWith('# ')) {
        elements.push(<h1 key={index} className="text-lg font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100">{parseInline(line.substring(2))}</h1>);
        return;
    }
    if (line.startsWith('## ')) {
        elements.push(<h2 key={index} className="text-base font-bold mt-3 mb-1 text-slate-800 dark:text-slate-100">{parseInline(line.substring(3))}</h2>);
        return;
    }

    // Handle Lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
            <div key={index} className="flex items-start gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">{parseInline(line.substring(2))}</span>
            </div>
        );
        return;
    }

    // Handle Blockquotes
    if (line.startsWith('> ')) {
        elements.push(
            <blockquote key={index} className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-1 my-2 text-slate-500 dark:text-slate-400 italic">
                {parseInline(line.substring(2))}
            </blockquote>
        );
        return;
    }

    // Handle Empty Lines
    if (line.trim() === '') {
        elements.push(<div key={index} className="h-2"></div>);
        return;
    }

    // Default Paragraph
    elements.push(<p key={index} className="mb-1 text-slate-700 dark:text-slate-300">{parseInline(line)}</p>);
  });

  return <div className="text-sm leading-relaxed">{elements}</div>;
};

const parseInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*.*?\*\*|_[^_]+_|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('_') && part.endsWith('_')) {
            return <em key={i} className="italic">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-rose-500">{part.slice(1, -1)}</code>;
        }
        return part;
    });
};

export default SimpleMarkdown;
