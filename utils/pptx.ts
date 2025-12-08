
export const parsePptx = async (file: File): Promise<string[]> => {
  // @ts-ignore
  const JSZip = window.JSZip;

  if (!JSZip) {
    console.error("JSZip library not found on window. Ensure it is loaded via script tag.");
    return [`
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#ef4444; text-align:center; padding:20px;">
        <h3 style="font-size:1.2em; margin-bottom:10px;">Missing Dependency</h3>
        <p>The <b>JSZip</b> library is required to parse PPTX files but was not found.</p>
        <p style="font-size:0.9em; opacity:0.8;">Please ensure your internet connection allows loading from CDN, or include the library locally.</p>
      </div>
    `];
  }

  try {
    const zip = await JSZip.loadAsync(file);
    const slideFiles: { name: string; content: string }[] = [];

    // 1. Identify Slides
    // Standard PPTX location: ppt/slides/slide1.xml, slide2.xml...
    const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/;
    
    for (const filename of Object.keys(zip.files)) {
      const match = filename.match(slideRegex);
      if (match) {
        const content = await zip.files[filename].async("string");
        slideFiles.push({
          name: filename,
          content: content
        });
      }
    }

    // Sort by slide number
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.name.match(slideRegex)![1]);
        const numB = parseInt(b.name.match(slideRegex)![1]);
        return numA - numB;
    });

    if (slideFiles.length === 0) {
        return ["<div style='padding:20px'>No slides found in this PPTX.</div>"];
    }

    // 2. Extract Text
    const parser = new DOMParser();
    
    const slidesHtml: string[] = slideFiles.map(slide => {
        const doc = parser.parseFromString(slide.content, "application/xml");
        let slideHtmlContent = "";
        
        // Try to find paragraphs directly first (<a:p>)
        // Common in PPTX: <p:txBody> -> <a:p>
        let allParagraphs = Array.from(doc.getElementsByTagName("*")).filter(el => el.localName === 'p');
        
        if (allParagraphs.length > 0) {
             allParagraphs.forEach(p => {
                 // Within paragraph, find runs (<a:r>) then text (<a:t>)
                 // This preserves order better
                 const runs = Array.from(p.getElementsByTagName("*")).filter(el => el.localName === 'r');
                 
                 let paraText = "";
                 if (runs.length > 0) {
                     runs.forEach(r => {
                         const texts = Array.from(r.getElementsByTagName("*")).filter(el => el.localName === 't');
                         texts.forEach(t => paraText += t.textContent);
                     });
                 } else {
                     // Fallback: direct text children in P (rare but possible in some exporters)
                     const texts = Array.from(p.getElementsByTagName("*")).filter(el => el.localName === 't');
                     texts.forEach(t => paraText += t.textContent);
                 }

                 if (paraText.trim()) {
                     // Check for basic styling cues (list items, titles)
                     // This is very heuristic
                     const isTitle = paraText.length < 100 && !slideHtmlContent; // First short text is often title
                     const style = isTitle 
                        ? "font-size: 24px; font-weight: bold; margin-bottom: 12px; color: #000000;" 
                        : "font-size: 16px; margin-bottom: 6px; color: #333333;";
                     
                     slideHtmlContent += `<div style="${style}">${paraText}</div>`;
                 }
             });
        }

        // Fallback: If structured parsing found nothing (e.g. text inside weird groups/tables without 'p' tags?)
        if (!slideHtmlContent) {
            const allTextTags = Array.from(doc.getElementsByTagName("*")).filter(el => el.localName === 't');
            if (allTextTags.length > 0) {
                const rawText = allTextTags.map(t => t.textContent).join(" ");
                if (rawText.trim()) {
                    slideHtmlContent = `<div style="font-size: 14px; color: #555555;">${rawText}</div>`;
                }
            }
        }
        
        // Wrap in slide container
        let outputHtml = `<div class="pptx-slide" style="
            padding: 40px; 
            font-family: Arial, sans-serif; 
            height: 100%; 
            background: white; 
            color: black;
            overflow: auto;
            position: relative;
        ">`;
        
        if (!slideHtmlContent) {
            outputHtml += `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#6b7280;">
                <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #d1d5db;">Slide ${slide.name.match(slideRegex)?.[1]}</h3>
                <p>No text content found.</p>
                <p style="font-size:0.8em; margin-top: 10px; color: #9ca3af;">(This slide likely contains images or shapes which are not currently supported in preview)</p>
            </div>`;
        } else {
            outputHtml += slideHtmlContent;
        }
        
        outputHtml += `</div>`;
        return outputHtml;
    });

    return slidesHtml;

  } catch (e) {
    console.error("Failed to parse PPTX", e);
    return [`<div style="padding:40px; color:red;">Error parsing PPTX file: ${(e as Error).message}</div>`];
  }
};
