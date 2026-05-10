type Tool = "draw" | "text" | "arrow";
type Stroke = { tool: Tool; points: { x: number; y: number }[]; text?: string };

const PINK = "#fe00fe";
const BORDER = "#121c2b";

export function createAnnotator(screenshotDataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    let activeTool: Tool = "draw";
    let drawing = false;
    let textInputActive = false;
    const strokes: Stroke[] = [];
    let currentStroke: Stroke | null = null;
    const toolButtons: HTMLButtonElement[] = [];

    const container = document.createElement("div");
    container.setAttribute("data-snapbug-ignore", "true");
    container.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;background:#121c2b;";

    const toolbar = document.createElement("div");
    toolbar.style.cssText = "position:relative;z-index:10;display:flex;align-items:center;gap:8px;padding:10px 16px;background:#1e293b;border-bottom:3px solid " + BORDER + ";user-select:none;";

    const tools: { id: Tool; label: string; svg: string }[] = [
      { id: "draw", label: "Draw", svg: '<path d="M3 17l4-4m0 0l10-10 4 4-10 10m-4 0l-1.5 5.5L7 21l4-1.5m-4 0l4-4"/>' },
      { id: "arrow", label: "Arrow", svg: '<path d="M5 19L19 5M19 5v10M19 5H9"/>' },
      { id: "text", label: "Text", svg: '<path d="M6 4h12M12 4v16M9 20h6"/>' }
    ];

    tools.forEach((tool) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = tool.label;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tool.svg}</svg>`;
      btn.style.cssText = toolBtnStyle(tool.id === activeTool);
      btn.addEventListener("click", () => {
        activeTool = tool.id;
        toolButtons.forEach((b, i) => { b.style.cssText = toolBtnStyle(tools[i].id === activeTool); });
      });
      toolButtons.push(btn);
      toolbar.appendChild(btn);
    });

    const separator = document.createElement("div");
    separator.style.cssText = "width:1px;height:24px;background:#475569;margin:0 4px;";
    toolbar.appendChild(separator);

    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.title = "Undo (Ctrl+Z)";
    undoBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`;
    undoBtn.style.cssText = toolBtnStyle(false);
    undoBtn.addEventListener("click", () => {
      if (strokes.length > 0) {
        strokes.pop();
        redraw();
      }
    });
    toolbar.appendChild(undoBtn);

    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    toolbar.appendChild(spacer);

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = actionBtnStyle("danger");
    toolbar.appendChild(cancelBtn);

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.textContent = "Skip annotation";
    skipBtn.style.cssText = actionBtnStyle("secondary");
    toolbar.appendChild(skipBtn);

    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.textContent = "Done";
    doneBtn.style.cssText = actionBtnStyle("primary");
    toolbar.appendChild(doneBtn);

    const canvasWrap = document.createElement("div");
    canvasWrap.style.cssText = "flex:1;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;padding:12px;";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.style.cssText = "max-width:100%;max-height:100%;cursor:crosshair;display:block;touch-action:none;";
      ctx.drawImage(img, 0, 0);

      canvasWrap.appendChild(canvas);
      container.appendChild(toolbar);
      container.appendChild(canvasWrap);
      document.documentElement.appendChild(container);

      cancelBtn.addEventListener("click", () => { cleanup(); resolve(null); });
      skipBtn.addEventListener("click", () => { cleanup(); resolve(screenshotDataUrl); });
      doneBtn.addEventListener("click", () => { cleanup(); resolve(canvas.toDataURL("image/png")); });

      attachCanvasEvents();
      attachKeyboard();
    };
    img.onerror = () => resolve(null);
    img.src = screenshotDataUrl;

    function cleanup() {
      document.removeEventListener("keydown", onKeyDown);
      container.remove();
    }

    function getCoords(e: PointerEvent | MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      for (const s of strokes) renderStroke(s);
      if (currentStroke) renderStroke(currentStroke);
    }

    function renderStroke(s: Stroke) {
      if (s.tool === "draw") renderFreehand(s.points);
      else if (s.tool === "arrow") renderArrow(s.points);
      else if (s.tool === "text" && s.text) renderText(s.points[0], s.text);
    }

    function renderFreehand(points: { x: number; y: number }[]) {
      if (points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = PINK;
      ctx.lineWidth = Math.max(3, canvas.width * 0.003);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }

    function renderArrow(points: { x: number; y: number }[]) {
      if (points.length < 2) return;
      const start = points[0];
      const end = points[points.length - 1];
      const lw = Math.max(3, canvas.width * 0.003);

      ctx.beginPath();
      ctx.strokeStyle = PINK;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLen = lw * 6;
      ctx.beginPath();
      ctx.fillStyle = PINK;
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headLen * Math.cos(angle - 0.4), end.y - headLen * Math.sin(angle - 0.4));
      ctx.lineTo(end.x - headLen * Math.cos(angle + 0.4), end.y - headLen * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    function renderText(pos: { x: number; y: number }, text: string) {
      const fontSize = Math.max(16, canvas.width * 0.018);
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = PINK;
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = fontSize * 0.15;
      ctx.strokeText(text, pos.x, pos.y);
      ctx.fillText(text, pos.x, pos.y);
    }

    function showTextInput(coords: { x: number; y: number }) {
      if (textInputActive) return;
      textInputActive = true;

      const rect = canvas.getBoundingClientRect();
      const screenX = (coords.x / canvas.width) * rect.width + rect.left;
      const screenY = (coords.y / canvas.height) * rect.height + rect.top;

      const inputWrap = document.createElement("div");
      inputWrap.style.cssText = `position:fixed;left:${screenX}px;top:${screenY - 40}px;z-index:2147483647;display:flex;gap:4px;`;

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Type annotation...";
      input.style.cssText = `padding:6px 10px;border:2px solid ${PINK};border-radius:4px;background:#1e293b;color:#fff;font:bold 13px/1 system-ui;outline:none;min-width:180px;`;

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.textContent = "Add";
      confirmBtn.style.cssText = `padding:6px 12px;border:2px solid ${BORDER};background:${PINK};color:#fff;font:bold 12px/1 system-ui;cursor:pointer;border-radius:4px;`;

      function finish() {
        const text = input.value.trim();
        if (text) {
          strokes.push({ tool: "text", points: [coords], text });
          redraw();
        }
        inputWrap.remove();
        textInputActive = false;
      }

      input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish();
        if (e.key === "Escape") { inputWrap.remove(); textInputActive = false; }
      });
      confirmBtn.addEventListener("click", (e) => { e.stopPropagation(); finish(); });

      inputWrap.appendChild(input);
      inputWrap.appendChild(confirmBtn);
      container.appendChild(inputWrap);
      input.focus();
    }

    function attachCanvasEvents() {
      canvas.addEventListener("pointerdown", (e) => {
        if (e.target !== canvas) return;
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        if (textInputActive) return;

        if (activeTool === "text") {
          showTextInput(getCoords(e));
          return;
        }

        drawing = true;
        currentStroke = { tool: activeTool, points: [getCoords(e)] };
      });

      canvas.addEventListener("pointermove", (e) => {
        if (!drawing || !currentStroke) return;
        currentStroke.points.push(getCoords(e));
        redraw();
      });

      canvas.addEventListener("pointerup", () => {
        if (!drawing || !currentStroke) return;
        drawing = false;
        strokes.push(currentStroke);
        currentStroke = null;
        redraw();
      });

      canvas.addEventListener("pointerleave", () => {
        if (drawing && currentStroke) {
          drawing = false;
          strokes.push(currentStroke);
          currentStroke = null;
          redraw();
        }
      });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (strokes.length > 0) {
          strokes.pop();
          redraw();
        }
      }
      if (e.key === "Escape" && !textInputActive) {
        cleanup();
        resolve(null);
      }
    };

    function attachKeyboard() {
      document.addEventListener("keydown", onKeyDown);
    }

    function toolBtnStyle(active: boolean) {
      return [
        "display:flex", "align-items:center", "justify-content:center",
        "width:36px", "height:36px",
        "border:2px solid " + (active ? PINK : "#475569"),
        "border-radius:6px",
        "background:" + (active ? PINK + "22" : "transparent"),
        "color:" + (active ? PINK : "#94a3b8"),
        "cursor:pointer"
      ].join(";");
    }

    function actionBtnStyle(variant: "primary" | "secondary" | "danger") {
      const bg = variant === "primary" ? PINK : variant === "danger" ? "#ff4d4d" : "#1e293b";
      const color = variant === "secondary" ? "#94a3b8" : "#fff";
      const shadow = variant === "secondary" ? "transparent" : BORDER;
      return [
        "padding:8px 16px",
        "border:3px solid " + BORDER,
        "border-radius:4px",
        "background:" + bg,
        "color:" + color,
        "font:bold 13px/1 system-ui,-apple-system,sans-serif",
        "cursor:pointer",
        "box-shadow:3px 3px 0 0 " + shadow,
        "margin-left:4px"
      ].join(";");
    }
  });
}
