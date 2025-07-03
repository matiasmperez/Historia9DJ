/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  X,
  Copyright,
  Move,
  Undo,
  Expand,
  RotateCcw,
  Download,
} from "lucide-react";

const App = () => {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const pagesRef = useRef([]);
  const [pageZooms, setPageZooms] = useState({});
  const [pageRotations, setPageRotations] = useState({});
  const [pagePanPositions, setPagePanPositions] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);

  // Configurar PDF.js
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      loadPDF();
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Manejar teclas de navegación
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft" && !isPanMode) {
        prevPage();
      } else if (event.key === "ArrowRight" && !isPanMode) {
        nextPage();
      } else if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      } else if (event.key === "f" || event.key === "F") {
        toggleFullscreen();
      } else if (event.key === " ") {
        event.preventDefault();
        resetAll();
      } else if (event.key === "d" || event.key === "D") {
        if (event.ctrlKey) {
          event.preventDefault();
          downloadPDF();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, isTransitioning, isFullscreen, pdfUrl]);

  // Función para descargar el PDF
  const downloadPDF = async () => {
    if (isDownloading || !pdfUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error("Error al descargar el archivo");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "Suplemento_El_Orden_75_Aniversario_9_de_Julio.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar el PDF:", error);
      alert("Error al descargar el archivo. Por favor, intenta nuevamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Cargar documento PDF
  const loadPDF = async () => {
    try {
      setIsLoading(true);
      const url = "https://staticfiles.magonservices.cloud/Libro.pdf";
      setPdfUrl(url); // Guardar la URL para descarga
      const loadingTask = window.pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);

      // Inicializar arreglo de páginas
      const initialPages = Array.from({ length: pdf.numPages }, (_, i) => ({
        id: i + 1,
        loading: true,
        image: null,
        text: "",
        content: `Página ${i + 1}`,
      }));

      setPages(initialPages);
      pagesRef.current = initialPages;

      // Inicializar zoom, rotación y posición de pan
      const initialZooms = {};
      const initialRotations = {};
      const initialPanPositions = {};
      initialPages.forEach((page) => {
        initialZooms[page.id] = 1;
        initialRotations[page.id] = 0;
        initialPanPositions[page.id] = { x: 0, y: 0 };
      });

      setPageZooms(initialZooms);
      setPageRotations(initialRotations);
      setPagePanPositions(initialPanPositions);
      setIsLoading(false);

      // Cargar primera página
      renderPage(1);
    } catch (error) {
      console.error("Error cargando PDF:", error);
      setIsLoading(false);
    }
  };

  // Renderizar página específica (lazy loading)
  const renderPage = async (pageNumber) => {
    if (!pdfDoc || pagesRef.current[pageNumber - 1]?.image) return;

    try {
      // Actualizar estado de carga
      setPages((prev) =>
        prev.map((page) =>
          page.id === pageNumber ? { ...page, loading: true } : page
        )
      );

      const page = await pdfDoc.getPage(pageNumber);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      const viewport = page.getViewport({ scale: 2 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Extraer texto
      let pageText = "";
      try {
        const textContent = await page.getTextContent();
        pageText = textContent.items.map((item) => item.str).join(" ");
      } catch (textError) {
        pageText = `Contenido de la página ${pageNumber}`;
      }

      const updatedPage = {
        id: pageNumber,
        loading: false,
        image: canvas.toDataURL(),
        text: pageText.substring(0, 500) + (pageText.length > 500 ? "..." : ""),
        content: `Página ${pageNumber}`,
      };

      // Actualizar estado
      setPages((prev) =>
        prev.map((p) => (p.id === pageNumber ? updatedPage : p))
      );
      pagesRef.current[pageNumber - 1] = updatedPage;
    } catch (error) {
      console.error(`Error renderizando página ${pageNumber}:`, error);
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageNumber
            ? {
                ...p,
                loading: false,
                image: null,
                text: `Error al cargar la página ${pageNumber}`,
              }
            : p
        )
      );
    }
  };

  // Precargar páginas adyacentes
  useEffect(() => {
    if (!pdfDoc) return;

    // Página actual
    renderPage(currentPage + 1);

    // Páginas adyacentes
    if (currentPage > 0) {
      renderPage(currentPage);
    }
    if (currentPage + 1 < totalPages) {
      renderPage(currentPage + 2);
    }
  }, [currentPage, pdfDoc, totalPages]);

  // Funciones de zoom
  const zoomIn = (pageId) => {
    setPageZooms((prev) => ({
      ...prev,
      [pageId]: Math.min(prev[pageId] * 1.2, 5),
    }));
  };

  const zoomOut = (pageId) => {
    setPageZooms((prev) => ({
      ...prev,
      [pageId]: Math.max(prev[pageId] / 1.2, 0.3),
    }));
  };

  const resetZoom = (pageId) => {
    setPageZooms((prev) => ({
      ...prev,
      [pageId]: 1,
    }));
    setPagePanPositions((prev) => ({
      ...prev,
      [pageId]: { x: 0, y: 0 },
    }));
  };

  // Funciones de pan/arrastre (solo en fullscreen)
  const handleMouseDown = (e, pageId) => {
    const zoom = pageZooms[pageId] || 1;
    if (isFullscreen) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - (pagePanPositions[pageId]?.x || 0),
        y: e.clientY - (pagePanPositions[pageId]?.y || 0),
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e, pageId) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    setPagePanPositions((prev) => ({
      ...prev,
      [pageId]: { x: newX, y: newY },
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e, pageId) => {
    if (isFullscreen && e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn(pageId);
      } else {
        zoomOut(pageId);
      }
    }
  };

  // Agregar event listeners globales para mouse
  useEffect(() => {
    const currentPageId = pages[currentPage]?.id;

    const handleGlobalMouseMove = (e) => {
      if (isDragging && currentPageId) {
        handleMouseMove(e, currentPageId);
      }
    };

    const handleGlobalMouseUp = () => {
      handleMouseUp();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, pages, currentPage]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    resetAll();
  };

  // Función para resetear todo
  const resetAll = () => {
    const resetZooms = {};
    const resetPanPositions = {};
    pages.forEach((page) => {
      resetZooms[page.id] = 1;
      resetPanPositions[page.id] = { x: 0, y: 0 };
    });
    setPageZooms(resetZooms);
    setPagePanPositions(resetPanPositions);
    setIsPanMode(false);
  };

  const nextPage = () => {
    if (currentPage < pages.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const prevPage = () => {
    if (currentPage > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const goToPage = (pageIndex) => {
    if (pageIndex !== currentPage && !isTransitioning) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPage(pageIndex);
        setIsTransitioning(false);
      }, 300);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-amber-900 mb-2">
            Cargando el libro...
          </h2>
          <p className="text-amber-700">Procesando páginas del PDF</p>
        </div>
      </div>
    );
  }

  const renderPageContent = (page) => {
    if (!page) return null;

    const zoom = pageZooms[page.id] || 1;
    const rotation = pageRotations[page.id] || 0;
    const panPosition = pagePanPositions[page.id] || { x: 0, y: 0 };

    return (
      <div
        className={`page-content ${
          isFullscreen ? "fullscreen-page" : "normal-page"
        } relative`}
      >
        {/* Controles de zoom y pantalla completa (solo zoom en fullscreen) */}
        <div
          className={`absolute ${
            isFullscreen ? "top-4 right-4" : "top-2 right-2"
          } z-20 flex gap-2 flex-wrap`}
        >
          {isFullscreen && (
            <>
              <button
                onClick={() => zoomOut(page.id)}
                className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-lg transition-all shadow-lg"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => resetZoom(page.id)}
                className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-lg"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => zoomIn(page.id)}
                className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-lg transition-all shadow-lg"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={resetAll}
                className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm transition-all shadow-lg"
                title="Resetear Todo"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </>
          )}
          <button
            onClick={toggleFullscreen}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-lg transition-all shadow-lg"
            title={
              isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"
            }
          >
            {isFullscreen ? (
              <X className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>

        {page.image ? (
          <div
            className="page-image-container"
            onWheel={(e) => handleWheel(e, page.id)}
          >
            <div
              className="image-wrapper"
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.3s ease",
                cursor: isFullscreen
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : !isFullscreen
                  ? "pointer"
                  : "default",
              }}
              onMouseDown={(e) => handleMouseDown(e, page.id)}
            >
              <img
                src={page.image}
                alt={`Página ${page.id}`}
                className="page-image"
                onClick={!isFullscreen ? toggleFullscreen : undefined}
                draggable={false}
              />
            </div>
          </div>
        ) : (
          <div className="example-page-content">
            <div className="text-center mb-8">
              <div className="text-8xl font-bold text-amber-700 mb-6">
                {page.id}
              </div>
              <div className="text-3xl text-gray-700 mb-8">{page.content}</div>
            </div>
            <div className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              {page.text}
            </div>
          </div>
        )}

        {!isFullscreen && (
          <div className="text-center text-sm text-gray-500 mt-4 pt-4 border-t">
            Página {page.id} de {pages.length} • Haz clic en la imagen para
            pantalla completa • F para pantalla completa • Espacio para resetear
            todo • Ctrl+D para descargar
          </div>
        )}
      </div>
    );
  };

  const currentPageData = pages[currentPage];

  return (
    <div className={isFullscreen ? "fullscreen-container" : "normal-container"}>
      {!isFullscreen && (
        <>
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-mono text-4xl font-bold mb-2 text-amber-900 flex items-center justify-center gap-3 uppercase">
              Suplemento el orden 75 aniversario de 9 de julio
            </h1>
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <button
              onClick={prevPage}
              disabled={currentPage === 0 || isTransitioning}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <div className="bg-white px-8 py-3 rounded-full shadow-md">
              <span className="text-amber-900 font-semibold text-lg">
                {currentPage + 1} de {pages.length}
              </span>
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage >= pages.length - 1 || isTransitioning}
              className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            {/* Botón de descarga */}
            <button
              onClick={downloadPDF}
              disabled={isDownloading || !pdfUrl}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
              title="Descargar PDF completo"
            >
              {isDownloading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              ) : (
                <Download className="w-8 h-8" />
              )}
            </button>
          </div>
        </>
      )}

      {/* Page Container */}
      <div
        className={`page-container ${isTransitioning ? "transitioning" : ""}`}
      >
        {currentPageData && renderPageContent(currentPageData)}
      </div>

      {!isFullscreen && (
        <>
          {/* Page indicator dots */}
          <div className="flex justify-center mt-8 gap-2 flex-wrap max-w-4xl mx-auto">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  currentPage === i
                    ? "bg-amber-600 scale-125 shadow-lg"
                    : "bg-amber-300 hover:bg-amber-400 hover:scale-110"
                }`}
                title={`Ir a página ${i + 1}`}
              ></button>
            ))}
          </div>

          {/* Instructions */}
          <div className="text-center mt-8 py-6 ">
            <div className="flex items-center justify-center gap-2 text-gray-600 text-sm mb-2">
              <Copyright className="w-4 h-4" />
              <span>Digitalizado por</span>
              <a
                href="https://www.instagram.com/magonsoftware/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-black-600 hover:text-black-800 transition-colors duration-200 hover:underline"
              >
                MagonSoftware
              </a>
            </div>

            <div className="text-xs text-gray-500">
              <span>Diseño y desarrollo de sistemas a medida</span>
            </div>

            {/* Decorative line */}
            <div className="flex items-center justify-center mt-4">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent w-32"></div>
            </div>
          </div>
        </>
      )}

      {/* Fullscreen Navigation */}
      {isFullscreen && (
        <div className="fullscreen-nav">
          <button
            onClick={prevPage}
            disabled={currentPage === 0 || isTransitioning}
            className="nav-btn nav-btn-left"
          >
            <ChevronLeft className="w-12 h-12" />
          </button>

          <button
            onClick={nextPage}
            disabled={currentPage >= pages.length - 1 || isTransitioning}
            className="nav-btn nav-btn-right"
          >
            <ChevronRight className="w-12 h-12" />
          </button>

          {/* Botón de descarga en fullscreen */}
          <button
            onClick={downloadPDF}
            disabled={isDownloading || !pdfUrl}
            className="absolute top-4 left-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all shadow-lg"
            title="Descargar PDF completo"
          >
            {isDownloading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <Download className="w-6 h-6" />
            )}
          </button>

          <div className="fullscreen-info">
            <span className="text-white text-lg font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
              {currentPage + 1} / {pages.length}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .normal-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #fef7ed 0%, #fed7aa 100%);
          padding: 2rem 1rem;
        }

        .fullscreen-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #000;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-container {
          max-width: 6xl;
          margin: 0 auto;
          transition: opacity 0.3s ease;
        }

        .page-container.transitioning {
          opacity: 0.7;
        }

        .normal-page {
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          min-height: 700px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .fullscreen-page {
          width: 100vw;
          height: 100vh;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .page-image-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .image-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
        }

        .page-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          user-select: none;
        }

        .fullscreen-page .page-image {
          max-width: calc(100vw - 4rem);
          max-height: calc(100vh - 4rem);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .example-page-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          padding: 2rem;
        }

        .fullscreen-nav {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
        }

        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.7);
          hover:background: rgba(0, 0, 0, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          pointer-events: all;
          cursor: pointer;
        }

        .nav-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-50%) scale(1.1);
        }

        .nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .nav-btn-left {
          left: 2rem;
        }

        .nav-btn-right {
          right: 2rem;
        }

        .fullscreen-info {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          pointer-events: all;
        }

        @media (max-width: 768px) {
          .normal-page {
            margin: 1rem;
            padding: 1rem;
            min-height: 500px;
          }

          .nav-btn {
            width: 60px;
            height: 60px;
          }

          .nav-btn-left {
            left: 1rem;
          }

          .nav-btn-right {
            right: 1rem;
          }

          .fullscreen-info {
            bottom: 1rem;
          }
        }

        @media (max-width: 480px) {
          .normal-container {
            padding: 1rem 0.5rem;
          }

          .page-container {
            margin: 0;
          }

          .normal-page {
            margin: 0.5rem;
            padding: 1rem;
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
