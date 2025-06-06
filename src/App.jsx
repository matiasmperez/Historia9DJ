import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  X,
} from "lucide-react";

const App = () => {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estados para zoom y rotación por página
  const [pageZooms, setPageZooms] = useState({});
  const [pageRotations, setPageRotations] = useState({});

  // Configurar PDF.js
  useEffect(() => {
    // Cargar PDF.js desde CDN
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
      if (event.key === "ArrowLeft") {
        prevPage();
      } else if (event.key === "ArrowRight") {
        nextPage();
      } else if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      } else if (event.key === "f" || event.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, pages.length, isTransitioning, isFullscreen]);

  // Función para cargar el PDF desde la carpeta public
  const loadPDF = async () => {
    try {
      setIsLoading(true);

      // Cambia '' por el nombre de tu archivo
      const url = "https://staticfiles.magonservices.cloud/Libro.pdf";
      const loadingTask = window.pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      await renderAllPages(pdf);
    } catch (error) {
      console.error("Error cargando PDF:", error);
      // Si falla con libro.pdf, intenta con otros nombres comunes
      tryAlternativeFiles();
    }
  };

  // Intentar con nombres alternativos si no encuentra el archivo
  const tryAlternativeFiles = async () => {
    const alternativeNames = [
      "documento.pdf",
      "manual.pdf",
      "book.pdf",
      "mi-libro.pdf",
    ];

    for (const fileName of alternativeNames) {
      try {
        const url = `/${fileName}`;
        const loadingTask = window.pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        await renderAllPages(pdf);
        return;
      } catch (error) {
        console.log(`No se encontró ${fileName}`);
      }
    }

    // Si no encuentra ningún archivo, crear páginas de ejemplo
    createExamplePages();
  };

  // Renderizar todas las páginas del PDF
  const renderAllPages = async (pdf) => {
    const pdfPages = [];
    const initialZooms = {};
    const initialRotations = {};

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        // Configurar el viewport para buena calidad
        const viewport = page.getViewport({ scale: 2 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Renderizar la página
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // Extraer texto de la página
        let pageText = "";
        try {
          const textContent = await page.getTextContent();
          pageText = textContent.items.map((item) => item.str).join(" ");
        } catch (textError) {
          pageText = `Contenido de la página ${pageNum}`;
        }

        pdfPages.push({
          id: pageNum,
          content: `Página ${pageNum}`,
          image: canvas.toDataURL(),
          text:
            pageText.substring(0, 500) + (pageText.length > 500 ? "..." : ""),
        });

        // Inicializar zoom y rotación para cada página
        initialZooms[pageNum] = 1;
        initialRotations[pageNum] = 0;
      } catch (pageError) {
        console.error(`Error renderizando página ${pageNum}:`, pageError);
        pdfPages.push({
          id: pageNum,
          content: `Página ${pageNum}`,
          image: null,
          text: `Error al cargar la página ${pageNum}`,
        });
        initialZooms[pageNum] = 1;
        initialRotations[pageNum] = 0;
      }
    }

    setPages(pdfPages);
    setPageZooms(initialZooms);
    setPageRotations(initialRotations);
    setCurrentPage(0);
    setIsLoading(false);
  };

  // Crear páginas de ejemplo si no se encuentra el PDF
  const createExamplePages = () => {
    const examplePages = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      content: `Página ${i + 1}`,
      image: null,
      text: `Esta es la página ${
        i + 1
      } de ejemplo. Coloca tu archivo PDF en la carpeta public/ con el nombre 'libro.pdf' o modifica el código para usar el nombre de tu archivo.`,
    }));

    const initialZooms = {};
    const initialRotations = {};
    for (let i = 1; i <= 12; i++) {
      initialZooms[i] = 1;
      initialRotations[i] = 0;
    }

    setPages(examplePages);
    setPageZooms(initialZooms);
    setPageRotations(initialRotations);
    setCurrentPage(0);
    setIsLoading(false);
  };

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
  };

  const rotatePage = (pageId) => {
    setPageRotations((prev) => ({
      ...prev,
      [pageId]: (prev[pageId] + 90) % 360,
    }));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
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

  const resetBook = () => {
    setCurrentPage(0);
    setIsTransitioning(false);
    setIsFullscreen(false);
    // Reset all zooms and rotations
    const resetZooms = {};
    const resetRotations = {};
    pages.forEach((page) => {
      resetZooms[page.id] = 1;
      resetRotations[page.id] = 0;
    });
    setPageZooms(resetZooms);
    setPageRotations(resetRotations);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-amber-900 mb-2">
            Cargando tu libro...
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

    return (
      <div
        className={`page-content ${
          isFullscreen ? "fullscreen-page" : "normal-page"
        } relative`}
      >
        {/* Controles de zoom y rotación */}
        <div
          className={`absolute ${
            isFullscreen ? "top-4 right-4" : "top-2 right-2"
          } z-20 flex gap-2`}
        >
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
            onClick={() => rotatePage(page.id)}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-lg transition-all shadow-lg"
            title="Rotate"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-all shadow-lg"
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
          <div className="page-image-container">
            <div
              className="image-wrapper"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              <img
                src={page.image}
                alt={`Página ${page.id}`}
                className="page-image"
                onClick={!isFullscreen ? toggleFullscreen : undefined}
                style={{ cursor: !isFullscreen ? "pointer" : "default" }}
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
            pantalla completa • F para alternar pantalla completa
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
            <h1 className="text-4xl font-bold text-amber-900 mb-2 flex items-center justify-center gap-3">
              <BookOpen className="text-amber-700" />
              Mi Libro Digital
            </h1>
            <p className="text-amber-700">
              {pages.length} páginas • Página {currentPage + 1}
            </p>
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

            <button
              onClick={resetBook}
              className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl ml-4"
              title="Volver al inicio y resetear todo"
            >
              <RotateCcw className="w-8 h-8" />
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
              />
            ))}
          </div>

          {/* Instructions */}
          <div className="text-center mt-6 text-gray-600 text-sm">
            <p>
              Usa las flechas del teclado para navegar • F para pantalla
              completa • Click en imagen para ampliar
            </p>
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
        }

        .image-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
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
