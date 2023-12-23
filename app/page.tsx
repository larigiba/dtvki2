"use client";
import { useState, useRef, useEffect, ReactElement, use } from "react";
import { Message } from "@/types/message";
import { Send, X, ExternalLink } from "react-feather";
import LoadingDots from "@/components/LoadingDots";
import ResizeableTextArea from "@/components/ResizeableTextArea";
import Datev from "@/components/DatevLogo";
import PDFViewer from "@/components/PdfViewer";
import axios from "axios";
import { useMap } from "@/components/useMap";
import useAutosizeTextArea from "@/components/useAutosizeTextArea";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [bottomMessage, setBottomMessage] = useState<string>("");
  const [history, setHistory] = useState<Message[]>([]);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const bottomTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [outputExpanded, setOutputExpanded] = useState<boolean>(false);

  const sourceToPdf = useRef(new Map<string, string>());
  const [currOpenSource, setCurrOpenSource] = useState<string>("");
  const [sourceOpen, setSourceOpen] = useState<boolean>(false);

  const handleClick = (): void => {
    if (
      (!outputExpanded && message == "") ||
      (outputExpanded && bottomMessage == "")
    )
      return;
    if (outputExpanded) {
      setHistory((oldHistory) => [
        ...oldHistory,
        { role: "user", content: bottomMessage },
      ]);
      setBottomMessage("");
    }
    setLoading(true);
    // wait 1 sec
    setOutputExpanded(true);
    // const r: Message = {
    //   role: "assistant",
    //   content: `Bei der Altersvorsorge gibt es verschiedene wichtige Aspekte, die berücksichtigt werden sollten. Die Deutsche
    //     Rentenversicherung erklärt die Altersvorsorge anhand der "Drei Säulen der Altersvorsorge", die aus der gesetzlichen
    //     Rentenversicherung, der betrieblichen Altersvorsorge und der privaten Vorsorge besteht. Die betriebliche
    //     Altersvorsorge (bAV) wird über den Arbeitgeber aufgebaut und ist gesetzlich vorgeschrieben. Die private
    //     Altersvorsorge umfasst verschiedene Strategien zur langfristigen Vermögensbildung, wie Wertpapiere, Fonds,
    //     Immobilien und Versicherungen. Zudem gibt es staatlich geförderte Möglichkeiten zur Vorsorge im Alter, wie
    //     die Riester-Rente und die betriebliche Altersvorsorge. Es ist wichtig, die individuelle Lebenssituation, das Alter
    //     und die Risikobereitschaft bei der Auswahl der Altersvorsorge zu berücksichtigen. Die Altersvorsorge ist
    //     entscheidend, da die gesetzliche Rente oft nicht ausreicht, um den finanziellen Bedarf im Alter zu decken.`,
    //   links: [
    //     "https://apps.datev.de/help-center/documents/1031656",
    //     "https://apps.datev.de/help-center/documents/1034821",
    //   ],
    // };
    // setTimeout(() => {
    //   setHistory((oldHistory) => [...oldHistory, r]);
    //   setLoading(false);
    //   if (r.links) {
    //     fetchPdfSources(r.links);
    //   }
    // }, 1000);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: message, history: history }),
    })
      .then(async (res) => {
        const r = await res.json();
        setHistory((oldHistory) => [...oldHistory, r]);
        setLoading(false);
        if (r.links) {
          fetchPdfSources(r.links);
        }
      })
      .catch((err) => {
        alert(err);
      });
  };

  const formatPageName = (url: string) => {
    // Split the URL by "/" and get the last segment
    const pageName = url.split("/").pop();

    // Split by "-" and then join with space
    if (pageName) {
      const formattedName = pageName.split("-").join(" ");

      // Capitalize only the first letter of the entire string
      return formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
    }
  };

  const fetchPdfSources = (links: string[]) => {
    links.forEach((link) => {
      const documentId = link.split("/").pop();
      const newUrl = `https://www.datev.de/dnlexom/help-center/v1/documents/${documentId}/pdf`;

      fetch("/api/sourcefetch", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: JSON.stringify({ url: newUrl }),
      })
        .then((response) => response.json())
        .then((data) => {
          const blob = new Blob(
            [Uint8Array.from(atob(data.pdfData), (c) => c.charCodeAt(0))],
            { type: "application/pdf" }
          );
          const pdfUrl = URL.createObjectURL(blob);

          sourceToPdf.current.set(link, pdfUrl);
        })
        .catch((err) => {
          alert(err);
        });
    });
  };

  const openTab = (url: string, numRetries: number = 0) => {
    // try getting the pdf url from the map, if not yet available, retry
    console.log("OPENTAB CALLED", numRetries);
    let pdfUrl = sourceToPdf.current.get(url);
    setSourceOpen(true);
    if (!pdfUrl && numRetries < 5) {
      setTimeout(() => {
        openTab(url, numRetries + 1);
        console.log("RETRYING", numRetries);
      }, 1000);
      return;
    }
    if (!pdfUrl) {
      alert("PDF konnte nicht geladen werden.");
      return;
    }
    console.log("SOURCE URL");
    console.log(pdfUrl);
    setCurrOpenSource(pdfUrl);
  };

  const closeTab = () => {
    setSourceOpen(false);
  };

  useAutosizeTextArea(textAreaRef.current, message);
  useAutosizeTextArea(bottomTextAreaRef.current, bottomMessage);

  //scroll to bottom of chat
  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history]);

  const getHyChatData = async () => {
    fetch("http://localhost:8080/api/home", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data["message"]);
        alert(data["message"]);
      });
  };

  return (
    <main className="h-screen bg-white p-6 flex flex-col">
      <button onClick={getHyChatData}>Get HyChat Data</button>
      <div className="flex flex-col absolute left-14 top-[-6rem]">
        <span className="block text-xl text-white font-bold">
          Hilfe-Center mit KI
        </span>
      </div>
      <div className="h-screen bg-white flex flex-row gap-1 bg-[url('/images/datev_bg.png')] bg-cover">
        <div className="flex flex-col gap-4 w-full items-center h-full max-h-full">
          <span style={{ position: "absolute", bottom: "2em", right: "2em" }}>
            <Datev size="100" color="white" />
          </span>
          <div className="block h-8"></div>
          <div className="bg-white w-[90%] rounded-2xl border-purple-700 border-opacity-5 border flex flex-col max-h-full overflow-clip">
            <ResizeableTextArea
              outputExpanded={outputExpanded}
              message={message}
              handleClick={handleClick}
              loading={loading}
              setMessage={setMessage}
              isDisabled={outputExpanded}
              ref={textAreaRef}
              placeholder="Sagen Sie mir, wie ich Ihnen helfen kann."
            />
            <div
              id="chat-output"
              className={`relative rounded-2xl border-green-700 border-opacity-5 overflow-y-scroll transition-all duration-500 z-0 border w-full max-h-full ${
                outputExpanded
                  ? "h-[79.5vh] gap-4 pt-6 pl-4 [&>*:nth-last-child(2)]:mb-4"
                  : "h-0 p-0"
              } flex flex-col overflow-clip`}
              onSubmit={(e) => {
                e.preventDefault();
                handleClick();
              }}
            >
              {history.map((message: Message, idx) => {
                const isLastMessage = idx === history.length - 1;
                switch (message.role) {
                  case "assistant":
                    return (
                      <div
                        ref={isLastMessage ? lastMessageRef : null}
                        key={idx}
                        className="flex gap-2"
                      >
                        <div className="bg-gradient-to-r from-green-400 to-green-700 text-white font-bold relative w-24 h-14 bg-purple-100 rounded-full flex justify-center items-center text-center p-5 shadow-xl">
                          KI
                        </div>
                        <div className="w-auto mr-6 break-words bg-white rounded-b-xl rounded-tr-xl text-black p-6 shadow-[0_10px_40px_0px_rgba(0,0,0,0.15)]">
                          {message.links && (
                            <div className="mb-4 flex gap-2">
                              {/* <p className="text-sm font-medium text-slate-500">
                              Sources:
                            </p> */}

                              {message.links?.map((link, idx) => {
                                return (
                                  <span
                                    onClick={() => openTab(link)}
                                    key={link}
                                    className="block w-20 font-bold text-center px-3 py-2 text-sm  text-green-700 bg-green-100 rounded"
                                  >
                                    {
                                      idx /* {`${idx}:  ${formatPageName(link)}`} */
                                    }
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {message.content}
                        </div>
                      </div>
                    );
                  case "user":
                    return (
                      <div className="flex justify-end">
                        <div
                          className="w-auto max-w-xl break-words bg-white rounded-b-xl rounded-tl-xl text-black p-6 self-end shadow-[0_10px_40px_0px_rgba(0,0,0,0.15)]"
                          key={idx}
                          ref={isLastMessage ? lastMessageRef : null}
                        >
                          {message.content}
                        </div>
                        <div className="bg-gradient-to-r from-green-400 to-green-700 text-white font-bold relative w-14 h-14 bg-purple-100 rounded-full flex justify-center items-center text-center p-5 ml-2 mr-4 shadow-xl">
                          Sie
                        </div>
                      </div>
                    );
                }
              })}

              {loading && (
                <div ref={lastMessageRef} className="flex gap-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-700 text-white font-bold relative w-14 h-14 bg-purple-100 rounded-full flex justify-center items-center text-center p-5 shadow-xl">
                    KI
                  </div>
                  <div className="w-auto max-w-xl break-words bg-white rounded-b-xl rounded-tr-xl text-black p-6 shadow-[0_10px_40px_0px_rgba(0,0,0,0.15)]">
                    <LoadingDots />
                  </div>
                </div>
              )}

              <ResizeableTextArea
                outputExpanded={!outputExpanded}
                message={bottomMessage}
                handleClick={handleClick}
                loading={loading}
                setMessage={setBottomMessage}
                isDisabled={!outputExpanded}
                ref={bottomTextAreaRef}
                placeholder="Sagen Sie mir, wie ich Ihnen helfen kann."
                displayAtBottom={true}
                transition={true}
              />
            </div>
          </div>
        </div>

        <div
          className={`flex flex-col gap-4 ${
            sourceOpen ? "w-full" : "w-0"
          } items-start h-full max-h-full transition-all`}
        >
          <div className="block h-8"></div>
          <div
            className={`flex transition-all gap-1 z-10 duration-150 flex-col absolute top-10 ${
              sourceOpen ? "right-12" : "right-[-4rem]"
            }`}
          >
            {/* <a
                className="ml-10 w-fit block font-bold text-center px-3 py-2 text-sm  text-green-700 bg-green-100 rounded"
                href={currOpenSource}
              >
                Quelle öffnen
              </a> */}
            <a className="transition-all flex w-14 h-14 items-center justify-center rounded-full px-3 text-sm  bg-green-600 font-semibold text-white hover:bg-green-700 active:bg-green-800 relative disabled:bg-green-100 disabled:text-green-400">
              <ExternalLink href={currOpenSource}></ExternalLink>
            </a>
            <button
              onClick={(e) => {
                e.preventDefault();
                closeTab();
              }}
              className=" transition-all flex w-14 h-14 items-center justify-center rounded-full px-3 text-sm  bg-green-600 font-semibold text-white hover:bg-green-700 active:bg-green-800 relative disabled:bg-green-100 disabled:text-green-400"
              type="submit"
              aria-label="Send"
              disabled={!message || loading}
            >
              <X />
            </button>
          </div>
          <div className="bg-white w-[90%] relative rounded-2xl border-purple-700 border-opacity-5 border flex flex-col max-h-full overflow-clip h-[87vh]">
            <PDFViewer pdfUrl={currOpenSource} />
          </div>
        </div>
      </div>
    </main>
  );
}
