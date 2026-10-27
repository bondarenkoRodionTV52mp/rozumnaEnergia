import { useEffect, useRef, useState } from "react";
import DataTypeDropdown from "./components/DataTypeDropdown";
import DocumentWorkspace from "./components/DocumentWorkspace";
import FileWorkspace from "./components/FileWorkspace";
import RelationalWorkspace from "./components/RelationalWorkspace";
import { dataTypeOptions } from "./data/mockData";
import { ui } from "./styles/ui";

export default function App() {
  const [dataType, setDataType] = useState("relational");
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const dataMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target)) {
        setIsDataMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={ui.layout.page}>
      <div className={ui.layout.appShell}>
        <header className={ui.layout.header}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <h1 className={ui.text.pageTitle}>
              Графічний інтерфейс користувача керування даними
            </h1>
            <div className="flex flex-wrap items-start gap-3">
              <DataTypeDropdown
                dataType={dataType}
                isOpen={isDataMenuOpen}
                setIsOpen={setIsDataMenuOpen}
                setDataType={setDataType}
                options={dataTypeOptions}
                dropdownRef={dataMenuRef}
              />
            </div>
          </div>
        </header>
        {dataType === "document" ? <DocumentWorkspace />
          : dataType === "relational" ? <RelationalWorkspace />
            : <FileWorkspace />}
      </div>
    </div>
  );
}
