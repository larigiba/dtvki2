import axios from "axios";
import React, { useState, useEffect } from "react";
import LoadingDots from "./LoadingDots";

interface PDFViewerProps {
  pdfUrl: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
  // const [pdfUrl, setPdfUrl] = useState("");

  // useEffect(() => {
  //   axios.get(apiURL, { responseType: "blob" }).then((response) => {
  //     setPdfUrl(URL.createObjectURL(response.data));
  //   });
  // }, []);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          width="100%"
          height="100%"
          title="PDF Viewer"
        ></iframe>
      ) : (
        <div>
          <LoadingDots />
          <p>Loading PDF...</p>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
