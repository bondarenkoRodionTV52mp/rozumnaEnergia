import { ui } from "../styles/ui";

export default function DataTypeDropdown({
  dataType,
  isOpen,
  setIsOpen,
  setDataType,
  options,
  dropdownRef,
}) {
  const selectedOption = options.find(
    (item) => item.value === dataType
  );

  return (
    <div ref={dropdownRef} className={ui.dropdown.wrapper}>
      <label className={ui.text.label}>Тип даних</label>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={ui.dropdown.trigger}
      >
        {selectedOption?.label}
        <span className={ui.dropdown.chevron}>▾</span>
      </button>

      {isOpen && (
        <div className={ui.dropdown.menu}>
          {options.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setDataType(item.value);
                setIsOpen(false);
              }}
              className={ui.dropdown.menuItem}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}