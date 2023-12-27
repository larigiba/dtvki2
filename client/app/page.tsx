"use client";
import { useState, useRef, useEffect, ReactElement, use } from "react";
import { Message } from "@/types/message";
import {
  Send,
  X,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  MousePointer,
  FileText,
} from "react-feather";
import LoadingDots from "@/components/LoadingDots";
import ResizeableTextArea from "@/components/ResizeableTextArea";
import Datev from "@/components/DatevLogo";
import PDFViewer from "@/components/PdfViewer";
import axios from "axios";
import { useMap } from "@/components/useMap";
import useAutosizeTextArea from "@/components/useAutosizeTextArea";
import ".//gradient.css";

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [bottomMessage, setBottomMessage] = useState<string>("");
  const [history, setHistory] = useState<Message[]>([]);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const bottomTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [outputExpanded, setOutputExpanded] = useState<boolean>(false);

  const chatOutputRef = useRef<HTMLDivElement>(null);

  const sourceToPdf = useRef(new Map<string, string>());
  const sourceToTutorial = useRef(new Map<string, string>());
  const [currOpenSource, setCurrOpenSource] = useState<string>("");
  const [sourceOpen, setSourceOpen] = useState<boolean>(false);

  const getServerURL = () => {
    return process.env.NODE_ENV === "development"
      ? "http://localhost:8080"
      : "https://dtv-backend-production.up.railway.app";
  };

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

    // NEW

    queryHyChat(outputExpanded ? bottomMessage : message).then(async (r) => {
      const links = r[1].map((s: { source: any }) => s.source);
      const filteredLinks = links.filter(
        (item: any, index: any) => links.indexOf(item) === index
      );
      getClickTutorialLinks(filteredLinks).then((tutorialLinks) => {
        const newMessage: Message = {
          role: "assistant",
          content: r[0],
          links: filteredLinks,
          titles: r[1].map((s: { title: any }) => s.title),
          tutorialLinks: tutorialLinks,
        };
        setHistory((oldHistory) => [...oldHistory, newMessage]);
        setLoading(false);
        if (newMessage.links) {
          fetchPdfAndPageNumbers(filteredLinks);
        }
      });
    });
  };

  const getClickTutorialLinks = async (links: string[]) => {
    let tutorialLinks: string[] = [];

    for (const link of links) {
      const documentId = link.split("/").pop();
      const url = getServerURL() + "/api/get-tutorial";
      const tutorialUrlResponse = await axios.post(url, {
        documentId: documentId,
      });
      if (tutorialUrlResponse.data) {
        const tutorialUrl = tutorialUrlResponse.data.url;
        tutorialLinks.push(tutorialUrl);
      } else {
        tutorialLinks.push("");
      }
    }
    return tutorialLinks;
  };

  const fetchPdfAndPageNumbers = async (links: string[]) => {
    links.forEach(async (link) => {
      const documentId = link.split("/").pop();
      const newUrl = `https://www.datev.de/dnlexom/help-center/v1/documents/${documentId}/pdf`;

      try {
        const pdfetchUrl = getServerURL() + "/api/pdfetch";
        const pdfResponse = await axios.post(
          pdfetchUrl,
          {
            url: newUrl,
          },
          {
            responseType: "blob",
          }
        );

        const pdfBlob = pdfResponse.data;
        const pdfUrl = URL.createObjectURL(pdfBlob);
        sourceToPdf.current.set(link, pdfUrl);

        // Fetch the page numbers
        //const pdfetchHighlightsUrl = getServerURL() + "/api/pdfetch-highlights";
        //const pageNumberResponse = await axios.get(pdfetchHighlightsUrl);
      } catch (error) {
        console.error("Error fetching PDF:", error);
        throw error;
      }
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

  useEffect(() => {
    if (chatOutputRef.current) {
      chatOutputRef.current.scrollTo({
        top: chatOutputRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [history]);

  const debugHyChat = () => {
    const promise = new Promise((resolve, reject) => {
      const arrayOfStrings = [
        'Die Energiepreispauschale wird in der Lohn- und Gehaltsabrechnung als sonstiger Bezug versteuert und ist beitragsfrei in der Sozialversicherung. Um die Energiepreispauschale in der Lohn- und Gehaltsabrechnung zu ber\u00fccksichtigen, sollten Sie wie folgt vorgehen:\n\n1. \u00d6ffnen Sie den Mandanten in der Software "Lohn und Gehalt".\n2. Gehen Sie zu "Mandantendaten" und w\u00e4hlen Sie "Anpassung Lohnarten" aus.\n3. W\u00e4hlen Sie den Assistenten f\u00fcr Lohnarten aus.\n4. W\u00e4hlen Sie die Option "DATEV-Standardlohnarten einf\u00fcgen" und klicken Sie auf "Weiter".\n5. W\u00e4hlen Sie die Lohnart "5800 Energiepreispauschale" aus und klicken Sie auf "Weiter".\n6. \u00dcbernehmen Sie die ausgew\u00e4hlten Lohnarten und klicken Sie erneut auf "Weiter".\n\nUm sicherzustellen, dass die Energiepreispauschale nicht automatisch ausgezahlt wird, gibt es zwei M\u00f6glichkeiten:\n\n1. \u00d6ffnen Sie den Mandanten und gehen Sie zu "Mandantendaten". W\u00e4hlen Sie dann "Steuer" und "Allgemeine Daten" aus. Gehen Sie zur Registerkarte "Lohnsteuer-Anmeldung" und w\u00e4hlen Sie im Feld "Auszahlung Energiepreispauschale f\u00fcr Monat" die Option "Keine Auszahlung" aus.\n2. Alternativ k\u00f6nnen Sie auch den Mitarbeiter \u00f6ffnen. Gehen Sie zu "Stammdaten", dann zu "Steuer" und w\u00e4hlen Sie "Besonderheiten" aus. W\u00e4hlen Sie die Registerkarte "Sonstige Angaben" aus.\n\nBitte beachten Sie, dass dies allgemeine Schritte sind und je nach Softwareprogramm geringf\u00fcgige Abweichungen auftreten k\u00f6nnen. Es wird empfohlen, die spezifische Dokumentation oder Hilfe der verwendeten Software zu konsultieren, wenn Sie weitere Unterst\u00fctzung ben\u00f6tigen.',
        [
          {
            page_content:
              "2.2 Lohnart einf\u00fcgen\nDie Energiepreispauschale wird als sonstiger Bezug versteuert und ist beitragsfrei in der Sozialversicherung. \nLohnart f\u00fcr die Energiepreispauschale einf\u00fcgen\nVorgehen:\n1Mandaten in Lohn und Gehalt \u00f6ffnen.\n2Mandantendaten | Anpassung Lohnarten | Assistent Lohnarten w\u00e4hlen.\n3DATEV-Standardlohnarten einf\u00fcgen w\u00e4hlen und auf Weiter klicken.\n4Lohnart 5800 Energiepreispauschale w\u00e4hlen, nach Ausgew\u00e4hlte Lohnarten \u00fcbernehmen und auf Weiter \nklicken.",
            source: "https://apps.datev.de/help-center/documents/1024621",
            title: "Energiepreispauschale in Lohn und Gehalt abrechnen",
          },
          {
            page_content:
              "Damit die Energiepreispauschale nicht automatisch ausgezahlt wird, m\u00fcssen Sie die Vorbelegungen \npr\u00fcfen und \u00e4ndern. Sie haben hierf\u00fcr 2 M\u00f6glichkeiten:\n\u25aaMandanten in Lohn und Gehalt \u00f6ffnen: Mandantendaten | Steuer | Allgemeine Daten, Registerkarte \nLohnsteuer-Anmeldung w\u00e4hlen. Im Feld Auszahlung Energiepreispauschale f\u00fcr Monat Eintrag Keine \nAuszahlung w\u00e4hlen.\n- Oder -\n\u25aaMitarbeiter in Lohn und Gehalt \u00f6ffnen: Stammdaten | Steuer | Besonderheiten, Registerkarte Sonstige \nAngaben w\u00e4hlen.",
            source: "https://apps.datev.de/help-center/documents/1024621",
            title: "Energiepreispauschale in Lohn und Gehalt abrechnen",
          },
        ],
      ];
      setTimeout(() => {
        resolve(arrayOfStrings);
      }, 10);
    });
    return promise;
  };

  async function queryHyChat(question: string) {
    // NOTE: this is for debugging only
    //return debugHyChat();

    // get url based on dev or prod
    const hychatUrl = getServerURL() + "/api/hychat";
    // await axios reply
    try {
      const res = await axios.post(hychatUrl, {
        question: question,
      });
      const r = res.data;
      return r;
    } catch (err) {
      alert(err);
      return null;
    }
  }

  return (
    <main className="h-screen p-2 bg-white flex flex-col overflow-hidden">
      <div className="flex flex-col absolute left-14 top-[-6rem]">
        <span className="block text-xl text-white font-bold">
          Hilfe-Center mit KI
        </span>
      </div>
      <div
        className={`absolute ${
          outputExpanded && "opacity-0"
        } z-0 w-[80%] left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-70 rounded-xl p-4`}
      >
        <p>
          <strong className="text-center">Disclaimer</strong>
          <br />
          <br />
          Geben Sie hier oben Ihre Frage in natürlicher Sprache ein.
          <br />
          Das KI-System wird Ihnen eine maßgeschneiderte Antwort auf Basis der
          Dokumente im DATEV-Hilfe-Center erstellen.
          <br />
          Das System beachtet hierbei ausschließlich diese Dokumente, allgemeine
          Inhalte aus dem Netz werden nicht berücksichtigt.
          <br />
          <br />
          Es handelt sich um einen technischen Prototypen, weshalb die
          Antwortqualität schwanken kann.
          <br />
          Antworten können falsche Informationen enthalten oder nicht auf Ihre
          Frage eingehen.
          <br />
          Die Antworten enthalten Quellen, mit denen der Inhalt überprüft werden
          kann.
          <br />
          <br />
          Ihre Anfrage wird nicht zum Training von ChatGPT oder anderen Systemen
          der künstlichen Intelligenz verwendet.
          <br />
          Wir gewährleisten Ihnen die Vertraulichkeit und den Datenschutz Ihrer
          Anfrage.
          <br />
          Bitte geben Sie trotz allem keine sensitiven Informationen wie z.B.
          Klarnamen ein, <br />
          da ihre eingegebene Anfrage für die Verarbeitung an uns über das
          Internet gesendet werden muss.
        </p>
      </div>
      <div className="h-screen bg-white flex flex-row gap-1 rounded-xl gradientbg">
        <div className="flex flex-col z-10 gap-4 w-full items-center h-full max-h-[93%]">
          <span style={{ position: "absolute", bottom: "2em", right: "2em" }}>
            <Datev size="100" color="white" />
          </span>
          <div className="block h-2"></div>
          <div
            className={`transition-all ${
              outputExpanded ? "bg-slate-100 h-[82%]" : "bg-transparent"
            } w-[90%] rounded-2xl flex flex-col max-h-full overflow-clip`}
          >
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
              ref={chatOutputRef}
              className={`relative rounded-t-2xl rounded-b-lg border-green-700 border-opacity-5 overflow-y-scroll transition-all duration-500 z-0 border w-full max-h-full ${
                outputExpanded
                  ? "max-h-full h-full gap-4 pb-6 pt-6 pl-4 [&>*:nth-last-child(2)]:mb-4"
                  : "max-h-0 p-0"
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
                        <div className="bg-gradient-to-r from-green-400 to-green-700 text-white font-bold relative w-16 h-14 bg-purple-100 rounded-full flex justify-center items-center text-center p-5 shadow-xl">
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
                                  <div className="flex flex-col gap-2 justify-center items-center relative bg-green-200 rounded-lg p-3 shadow-sm">
                                    <span className="block relative w-full text-sm text-slate-800 font-bold text-center">
                                      {
                                        `${link.split("/").pop()}: ${
                                          message.titles && message.titles[idx]
                                        }` /* {`${idx}:  ${formatPageName(link)}`} */
                                      }
                                    </span>
                                    <span
                                      key={idx}
                                      className="flex flex-row gap-3 w-full relative"
                                    >
                                      {message.tutorialLinks &&
                                        message.tutorialLinks[idx] !== "" && (
                                          <a
                                            href={message.tutorialLinks[idx]}
                                            target="_blank"
                                            key={link}
                                            className="flex gap-2 justify-between w-fit font-bold text-center px-3 py-2 text-sm  text-green-800 bg-green-100 hover:underline rounded-lg shadow-md hover:translate-y-[-0.2rem] transition-all hover:shadow-lg"
                                          >
                                            <MousePointer className="w-6 h-6 text-green-500" />
                                            Klick-Tutorial öffnen
                                          </a>
                                        )}
                                      <a
                                        href={""}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          openTab(link);
                                        }}
                                        key={link}
                                        className="flex gap-2 justify-center w-fit font-bold text-center px-3 py-2 text-sm text-green-800 bg-green-100 hover:underline rounded-lg shadow-md hover:translate-y-[-0.2rem] transition-all hover:shadow-lg"
                                      >
                                        <FileText className="w-6 h-6 text-green-500" />
                                        Dokument hier öffnen
                                      </a>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className="flex gap-2 mt-4 right-0">
                            <ThumbsUp className="w-6 h-6 text-green-500" />
                            <ThumbsDown className="w-6 h-6 text-red-500" />
                          </div>
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
            </div>
          </div>
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

        <div
          className={`flex flex-col gap-4 ${
            sourceOpen ? "w-full" : "w-0"
          } items-start h-full max-h-full transition-all`}
        >
          <div className="block h-2"></div>
          <div
            className={`flex transition-all gap-1 z-10 duration-150 flex-col absolute top-10 ${
              sourceOpen
                ? "right-4 h-full w-fit opacity-100"
                : "right-[-4rem] h-full w-fit opacity-0"
            }`}
          >
            {/* <a
                className="ml-10 w-fit block font-bold text-center px-3 py-2 text-sm  text-green-700 bg-green-100 rounded"
                href={currOpenSource}
              >
                Quelle öffnen
              </a> */}
            <a
              href={currOpenSource}
              target="_blank"
              className="transition-all flex w-14 h-14 items-center justify-center rounded-full px-3 text-sm  bg-green-600 font-semibold text-white hover:bg-green-700 active:bg-green-800 relative disabled:bg-green-100 disabled:text-green-400"
            >
              <ExternalLink />
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
          <div className="bg-white w-[90%] relative rounded-2xl border-purple-700 border-opacity-5 border flex flex-col max-h-full overflow-clip h-[89%]">
            <PDFViewer pdfUrl={currOpenSource + "#view=FitH"} />
          </div>
        </div>
      </div>
    </main>
  );
}
