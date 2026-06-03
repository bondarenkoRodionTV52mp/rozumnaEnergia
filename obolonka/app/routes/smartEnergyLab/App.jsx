
import { useState, useEffect, useCallback, useRef } from "react";
const API_URL = "http://77.47.192.6:6007";

const MPPT_EFFICIENCY_BONUS = 1.25;
const PWM_EFFICIENCY        = 1.00; 

const LEAD_ACID_WARN_SOC = 50;  
const LIFEPO4_MIN_SOC    = 10;  

const CRITICAL_SENSOR_IDS = ["VOL1", "INA2", "ESP1", "REL1"];

const DEFAULT_SYSTEM = {
  solarPanels: [
    { power: 300, voltage: 36, efficiency: 18.5, active: true },
    { power: 300, voltage: 36, efficiency: 18.5, active: true },
  ],
  batteries: [
    { capacity: 100, voltage: 12, soc: 75, chemistry: "AGM" },
  ],
  inverter:         { power: 2000, currentLoad: 450 },
  chargeController: { power: 40, voltage: 48, type: "MPPT" },
  sensors: [
    { id: "INA1", name: "Датчик сонячного струму",   type: "Current",         parameter: "SolarCurrent",   enabled: true, critical: false },
    { id: "INA2", name: "Датчик навантаження",    type: "Current",         parameter: "LoadCurrent",    enabled: true, critical: true  },
    { id: "VOL1", name: "Датчик напруги батареї", type: "Voltage",         parameter: "BatteryVoltage", enabled: true, critical: true  },
    { id: "TMP1", name: "Датчик температури інвертора",   type: "Temperature",     parameter: "InverterTemp",   enabled: true, critical: false },
    { id: "ESP1", name: "ESP32 MCU",              type: "Microcontroller", parameter: "SystemControl",  enabled: true, critical: true  },
    { id: "REL1", name: "Модуль реле",           type: "Relay",           parameter: "LoadSwitch",     enabled: true, critical: true  },
  ],
};


const SCENARIOS = [
  {
    id: "autonomous", label: "Автономний режим", icon: "ti-sun",
    desc: "Батарея + сонячні панелі, повністю автономно",
    apply: s => ({
      solarPanels: s.solarPanels.map(p => ({ ...p, active: true })),
      inverter:    { ...s.inverter, currentLoad: 450 },
      batteries:   s.batteries.map(b => ({ ...b, soc: Math.max(b.soc, 60) })),
      sensors:     s.sensors.map(sx => ({ ...sx, enabled: true })),
    }),
  },
  {
    id: "solar_charge", label: "Сонячний заряд + SOC", icon: "ti-battery-charging",
    desc: "MPPT-контролер керує циклами зарядки",
    apply: s => ({
      solarPanels:      s.solarPanels.map(p => ({ ...p, active: true })),
      inverter:         { ...s.inverter, currentLoad: 200 },
      batteries:        s.batteries.map(b => ({ ...b, soc: 40 })),
      chargeController: { ...s.chargeController, type: "MPPT" },
    }),
  },
  {
    id: "low_soc", label: "Низький SOC + економія", icon: "ti-alert-triangle",
    desc: "Батарея розряджена — активується режим економії",
    apply: s => ({
      solarPanels: s.solarPanels.map(p => ({ ...p, active: true })),
      inverter:    { ...s.inverter, currentLoad: 600 },
      batteries:   s.batteries.map(b => ({ ...b, soc: 22 })),
    }),
  },
  {
    id: "night_mode", label: "Нічний режим", icon: "ti-moon",
    desc: "Немає сонячної генерації, мінімальне навантаження",
    apply: s => ({
      solarPanels: s.solarPanels.map(p => ({ ...p, active: false, power: 0 })),
      inverter:    { ...s.inverter, currentLoad: 80 },
    }),
  },
  {
    id: "emergency", label: "Аварійний режим", icon: "ti-flame",
    desc: "Критичне збої сенсора + швидке розрядження батареї",
    apply: s => ({
      sensors:   s.sensors.map(sx => sx.id === "VOL1" ? { ...sx, enabled: false } : sx),
      batteries: s.batteries.map(b => ({ ...b, soc: 18 })),
      inverter:  { ...s.inverter, currentLoad: 1850 },
    }),
  },
  {
    id: "peak_load", label: "Пікове навантаження", icon: "ti-bolt",
    desc: "Максимальний попит — тест ризику перевантаження",
    apply: s => ({
      inverter:    { ...s.inverter, currentLoad: Math.round(s.inverter.power * 0.95) },
      solarPanels: s.solarPanels.map(p => ({ ...p, active: true })),
    }),
  },
];



function generateOWL(system, scenarioLabel, ph) {
  const ts = new Date().toISOString();
  const { solarPanels, batteries, inverter, chargeController, sensors } = system;


  const panelInds = solarPanels.map((p,i) => `
  <owl:NamedIndividual rdf:about="&se;SolarPanel_${i+1}">
    <rdf:type rdf:resource="&se;SolarPanel"/>
    <se:hasPower rdf:datatype="&xsd;float">${p.power}</se:hasPower>
    <se:hasVoltage rdf:datatype="&xsd;float">${p.voltage}</se:hasVoltage>
    <se:hasEfficiency rdf:datatype="&xsd;float">${p.efficiency}</se:hasEfficiency>
    <se:isGenerating rdf:datatype="&xsd;boolean">${p.active}</se:isGenerating>
    <se:hasLabel rdf:datatype="&xsd;string">Solar Panel ${i+1}</se:hasLabel>
  </owl:NamedIndividual>`).join("\n");

  const batteryInds = batteries.map((b,i) => `
  <owl:NamedIndividual rdf:about="&se;Battery_${i+1}">
    <rdf:type rdf:resource="&se;Battery"/>
    <se:hasCapacity rdf:datatype="&xsd;float">${b.capacity}</se:hasCapacity>
    <se:hasVoltage rdf:datatype="&xsd;float">${b.voltage}</se:hasVoltage>
    <se:hasSOC rdf:datatype="&xsd;float">${b.soc}</se:hasSOC>
    <se:hasChemistry rdf:datatype="&xsd;string">${b.chemistry}</se:hasChemistry>
    <se:hasBatteryState rdf:datatype="&xsd;string">${b.soc<20?"LowSOC":ph.netPower>0?"Charging":"Discharging"}</se:hasBatteryState>
    <se:hasLabel rdf:datatype="&xsd;string">Battery ${i+1}</se:hasLabel>
  </owl:NamedIndividual>`).join("\n");

  const sensorInds = sensors.map(s => `
  <owl:NamedIndividual rdf:about="&se;Sensor_${s.id}">
    <rdf:type rdf:resource="&se;Sensor"/>
    <se:sensorType rdf:datatype="&xsd;string">${s.type}</se:sensorType>
    <se:measuresParameter rdf:datatype="&xsd;string">${s.parameter}</se:measuresParameter>
    <se:isEnabled rdf:datatype="&xsd;boolean">${s.enabled}</se:isEnabled>
    <se:isCritical rdf:datatype="&xsd;boolean">${s.critical}</se:isCritical>
    <se:hasLabel rdf:datatype="&xsd;string">${s.name}</se:hasLabel>
  </owl:NamedIndividual>`).join("\n");

  return `<?xml version="1.0"?>
<!DOCTYPE rdf:RDF [
  <!ENTITY se  "http://www.smartenergy.lab/ontology#">
  <!ENTITY owl "http://www.w3.org/2002/07/owl#">
  <!ENTITY xsd "http://www.w3.org/2001/XMLSchema#">
  <!ENTITY rdf "http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <!ENTITY rdfs "http://www.w3.org/2000/01/rdf-schema#">
]>
<!-- SmartEnergy Lab Ontology | Generated: ${ts} | Scenario: ${scenarioLabel} -->
<rdf:RDF xmlns="http://www.smartenergy.lab/ontology#"
  xml:base="http://www.smartenergy.lab/ontology"
  xmlns:se="http://www.smartenergy.lab/ontology#"
  xmlns:owl="http://www.w3.org/2002/07/owl#"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema#">

  <owl:Ontology rdf:about="http://www.smartenergy.lab/ontology">
    <rdfs:label>SmartEnergy Lab Ontology</rdfs:label>
    <rdfs:comment>Ontology for SmartEnergy Lab solar power system modeling. v2.0</rdfs:comment>
    <owl:versionInfo>2.0</owl:versionInfo>
  </owl:Ontology>

  <!-- === CLASSES === -->
  <owl:Class rdf:about="&se;EnergyComponent"><rdfs:label>Energy Component</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;SolarPanel"><rdfs:subClassOf rdf:resource="&se;EnergyComponent"/><rdfs:label>Solar Panel</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;Battery"><rdfs:subClassOf rdf:resource="&se;EnergyComponent"/><rdfs:label>Battery</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;Inverter"><rdfs:subClassOf rdf:resource="&se;EnergyComponent"/><rdfs:label>Inverter</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;ChargeController"><rdfs:subClassOf rdf:resource="&se;EnergyComponent"/><rdfs:label>Charge Controller</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;Sensor"><rdfs:subClassOf rdf:resource="&se;EnergyComponent"/><rdfs:label>Sensor</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;CurrentSensor"><rdfs:subClassOf rdf:resource="&se;Sensor"/><rdfs:label>Current Sensor</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;VoltageSensor"><rdfs:subClassOf rdf:resource="&se;Sensor"/><rdfs:label>Voltage Sensor</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;TemperatureSensor"><rdfs:subClassOf rdf:resource="&se;Sensor"/><rdfs:label>Temperature Sensor</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;SystemState"><rdfs:label>System State</rdfs:label></owl:Class>
  <owl:Class rdf:about="&se;OperationScenario"><rdfs:label>Operation Scenario</rdfs:label></owl:Class>

  <!-- === OBJECT PROPERTIES === -->
  <owl:ObjectProperty rdf:about="&se;chargesFrom"><rdfs:domain rdf:resource="&se;Battery"/><rdfs:range rdf:resource="&se;SolarPanel"/></owl:ObjectProperty>
  <owl:ObjectProperty rdf:about="&se;controlledBy"><rdfs:domain rdf:resource="&se;SolarPanel"/><rdfs:range rdf:resource="&se;ChargeController"/></owl:ObjectProperty>
  <owl:ObjectProperty rdf:about="&se;monitors"><rdfs:domain rdf:resource="&se;Sensor"/><rdfs:range rdf:resource="&se;EnergyComponent"/></owl:ObjectProperty>
  <owl:ObjectProperty rdf:about="&se;hasScenario"><rdfs:domain rdf:resource="&se;SystemState"/><rdfs:range rdf:resource="&se;OperationScenario"/></owl:ObjectProperty>

  <!-- === DATA PROPERTIES === -->
  <owl:DatatypeProperty rdf:about="&se;hasPower"><rdfs:range rdf:resource="&xsd;float"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasVoltage"><rdfs:range rdf:resource="&xsd;float"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasCapacity"><rdfs:domain rdf:resource="&se;Battery"/><rdfs:range rdf:resource="&xsd;float"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasSOC"><rdfs:domain rdf:resource="&se;Battery"/><rdfs:range rdf:resource="&xsd;float"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasEfficiency"><rdfs:domain rdf:resource="&se;SolarPanel"/><rdfs:range rdf:resource="&xsd;float"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasChemistry"><rdfs:domain rdf:resource="&se;Battery"/><rdfs:range rdf:resource="&xsd;string"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasBatteryState"><rdfs:domain rdf:resource="&se;Battery"/><rdfs:range rdf:resource="&xsd;string"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;isGenerating"><rdfs:domain rdf:resource="&se;SolarPanel"/><rdfs:range rdf:resource="&xsd;boolean"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;isEnabled"><rdfs:domain rdf:resource="&se;Sensor"/><rdfs:range rdf:resource="&xsd;boolean"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;isCritical"><rdfs:domain rdf:resource="&se;Sensor"/><rdfs:range rdf:resource="&xsd;boolean"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasCurrentLoad"><rdfs:domain rdf:resource="&se;Inverter"/><rdfs:range rdf:resource="&xsd;float"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasControllerType"><rdfs:domain rdf:resource="&se;ChargeController"/><rdfs:range rdf:resource="&xsd;string"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasEfficiencyBonus"><rdfs:domain rdf:resource="&se;ChargeController"/><rdfs:range rdf:resource="&xsd;float"/></owl:DatatypeProperty>
  <owl:DatatypeProperty rdf:about="&se;hasLabel"><rdfs:range rdf:resource="&xsd;string"/></owl:DatatypeProperty>

  <!-- === INDIVIDUALS === -->
${panelInds}
${batteryInds}
  <owl:NamedIndividual rdf:about="&se;Inverter_1">
    <rdf:type rdf:resource="&se;Inverter"/>
    <se:hasPower rdf:datatype="&xsd;float">${inverter.power}</se:hasPower>
    <se:hasCurrentLoad rdf:datatype="&xsd;float">${inverter.currentLoad}</se:hasCurrentLoad>
    <se:hasBatteryState rdf:datatype="&xsd;string">${ph.invOverload?"OverloadRisk":"Nominal"}</se:hasBatteryState>
    <se:hasLabel rdf:datatype="&xsd;string">Main Inverter</se:hasLabel>
  </owl:NamedIndividual>
  <owl:NamedIndividual rdf:about="&se;ChargeController_1">
    <rdf:type rdf:resource="&se;ChargeController"/>
    <se:hasPower rdf:datatype="&xsd;float">${chargeController.power}</se:hasPower>
    <se:hasVoltage rdf:datatype="&xsd;float">${chargeController.voltage}</se:hasVoltage>
    <se:hasControllerType rdf:datatype="&xsd;string">${chargeController.type}</se:hasControllerType>
    <se:hasEfficiencyBonus rdf:datatype="&xsd;float">${chargeController.type==="MPPT"?0.25:0.00}</se:hasEfficiencyBonus>
    <se:hasLabel rdf:datatype="&xsd;string">Charge Controller</se:hasLabel>
  </owl:NamedIndividual>
${sensorInds}

  <!--
    SWRL RULES (paste into Protégé SWRL tab):
    Rule 1: Battery(?b) ^ hasSOC(?b,?s) ^ swrlb:lessThan(?s,20.0) -> hasBatteryState(?b,"LowSOC")
    Rule 2: Inverter(?i) ^ hasCurrentLoad(?i,?l) ^ hasPower(?i,?m) ^ swrlb:greaterThan(?l,swrlb:multiply(?m,0.9)) -> hasAlert(?i,"OverloadRisk")
    Rule 3: Battery(?b) ^ hasSOC(?b,?s) ^ swrlb:lessThan(?s,25.0) ^ Inverter(?i) ^ hasCurrentLoad(?i,?l) ^ swrlb:greaterThan(?l,500.0) -> hasOperationMode(?sys,"EconomyMode")
    Rule 4: SolarPanel(?p) ^ isGenerating(?p,true) ^ Battery(?b) ^ hasSOC(?b,?s) ^ swrlb:greaterThan(?s,20.0) -> hasOperationMode(?sys,"AutonomousMode")
    Rule 5: Battery(?b) ^ hasChemistry(?b,?c) ^ swrlb:memberOf(?c,{"AGM","GEL","Flooded"}) ^ hasSOC(?b,?s) ^ swrlb:lessThan(?s,50.0) -> hasRisk(?b,"PlateSulfation")
    Rule 6: ChargeController(?cc) ^ hasControllerType(?cc,"MPPT") ^ SolarPanel(?p) ^ isGenerating(?p,true) -> hasEfficiencyBonus(?cc,0.25)

    CQ Answers at export time:
    CQ1 SOC: ${ph.avgSOC.toFixed(1)}%
    CQ2 Generation: ${ph.effectiveGen.toFixed(0)}W effective
    CQ3 Overload: ${ph.invOverload?"YES":"No"}
    CQ6 Critical load feasible at SOC=25%: ${ph.avgSOC>=25?"YES":"NO"}
  -->
</rdf:RDF>`;
}


const ONTOLOGY_SCHEMA = {
  id: "EnergyComponent", label: "EnergyComponent", color: "#185FA5", dataProps: [],
  children: [
    {
      id: "SolarPanel", label: "SolarPanel", color: "#3B6D11",
      dataProps: [
        { key: "hasPower",      unit: "W",  path: s => s.solarPanels.map((p,i) => ({ id: `SolarPanel_${i+1}`, v: p.power })) },
        { key: "hasVoltage",    unit: "V",  path: s => s.solarPanels.map((p,i) => ({ id: `SolarPanel_${i+1}`, v: p.voltage })) },
        { key: "hasEfficiency", unit: "%",  path: s => s.solarPanels.map((p,i) => ({ id: `SolarPanel_${i+1}`, v: p.efficiency })) },
        { key: "isGenerating",  unit: "",   path: s => s.solarPanels.map((p,i) => ({ id: `SolarPanel_${i+1}`, v: String(p.active) })) },
      ],
      children: [],
    },
    {
      id: "Battery", label: "Battery", color: "#854F0B",
      dataProps: [
        { key: "hasSOC",       unit: "%",  path: s => s.batteries.map((b,i) => ({ id: `Battery_${i+1}`, v: b.soc })) },
        { key: "hasCapacity",  unit: "Ah", path: s => s.batteries.map((b,i) => ({ id: `Battery_${i+1}`, v: b.capacity })) },
        { key: "hasVoltage",   unit: "V",  path: s => s.batteries.map((b,i) => ({ id: `Battery_${i+1}`, v: b.voltage })) },
        { key: "hasChemistry", unit: "",   path: s => s.batteries.map((b,i) => ({ id: `Battery_${i+1}`, v: b.chemistry })) },
      ],
      children: [],
    },
    {
      id: "Inverter", label: "Inverter", color: "#A32D2D",
      dataProps: [
        { key: "hasPower",       unit: "W", path: s => [{ id: "Inverter_1", v: s.inverter.power }] },
        { key: "hasCurrentLoad", unit: "W", path: s => [{ id: "Inverter_1", v: s.inverter.currentLoad }] },
      ],
      children: [],
    },
    {
      id: "ChargeController", label: "ChargeController", color: "#0F6E56",
      dataProps: [
        { key: "hasControllerType",  unit: "", path: s => [{ id: "CC_1", v: s.chargeController.type }] },
        { key: "hasEfficiencyBonus", unit: "", path: s => [{ id: "CC_1", v: s.chargeController.type === "MPPT" ? "0.25" : "0.00" }] },
        { key: "hasPower",           unit: "A",path: s => [{ id: "CC_1", v: s.chargeController.power }] },
      ],
      children: [],
    },
    {
      id: "Sensor", label: "Sensor", color: "#534AB7",
      dataProps: [
        { key: "isEnabled",  unit: "", path: s => s.sensors.map(sx => ({ id: `Sensor_${sx.id}`, v: String(sx.enabled) })) },
        { key: "isCritical", unit: "", path: s => s.sensors.map(sx => ({ id: `Sensor_${sx.id}`, v: String(sx.critical) })) },
      ],
      children: [
        { id: "CurrentSensor",     label: "CurrentSensor",     color: "#7F77DD", dataProps: [], children: [] },
        { id: "VoltageSensor",     label: "VoltageSensor",     color: "#7F77DD", dataProps: [], children: [] },
        { id: "TemperatureSensor", label: "TemperatureSensor", color: "#7F77DD", dataProps: [], children: [] },
      ],
    },
  ],
};


function Card({ children, style = {}, highlight = false }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: highlight ? "1.5px solid #E24B4A" : "0.5px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem",
      transition: "border-color 0.3s", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--color-text-secondary)", margin: "0 0 12px",
      borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 7,
    }}>
      {children}
    </h3>
  );
}

function Badge({ children, color = "gray", small = false }) {
  const map = {
    green:  { bg: "#EAF3DE", fg: "#3B6D11" },
    red:    { bg: "#FCEBEB", fg: "#A32D2D" },
    amber:  { bg: "#FAEEDA", fg: "#854F0B" },
    blue:   { bg: "#E6F1FB", fg: "#185FA5" },
    gray:   { bg: "#F1EFE8", fg: "#5F5E5A" },
    teal:   { bg: "#E1F5EE", fg: "#0F6E56" },
    purple: { bg: "#EEEDFE", fg: "#534AB7" },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{
      background: s.bg, color: s.fg, fontSize: small ? 10 : 11, fontWeight: 500,
      padding: small ? "1px 5px" : "2px 8px", borderRadius: 4,
      display: "inline-block", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, sub, color = "gray" }) {
  const fg = { green: "#3B6D11", red: "#A32D2D", amber: "#854F0B", blue: "#185FA5", gray: "var(--color-text-primary)", teal: "#0F6E56" };
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.875rem 1rem" }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: fg[color] || fg.gray, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function NumInput({ label, value, min, max, step = 1, unit, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ width: 76, fontSize: 13, padding: "4px 8px" }} />
        {unit && <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{unit}</span>}
      </div>
    </div>
  );
}


function ToastArea({ toasts, onDismiss }) {
  const bg   = { critical: "#FCEBEB", error: "#FAEEDA", info: "#EAF3DE" };
  const bdr  = { critical: "#F09595", error: "#FAC775", info: "#C0DD97" };
  const side = { critical: "#E24B4A", error: "#EF9F27", info: "#639922" };
  const icon = { critical: "ti-alert-octagon", error: "ti-alert-triangle", info: "ti-info-circle" };
  const hdg  = { critical: "Аварійна зупинка", error: "Системне попередження", info: "Сценарій застосовано" };
  const fg   = { critical: "#A32D2D", error: "#854F0B", info: "#3B6D11" };

  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 380 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: bg[t.level] || bg.info,
          border: `0.5px solid ${bdr[t.level] || bdr.info}`,
          borderLeft: `3px solid ${side[t.level] || side.info}`,
          borderRadius: "var(--border-radius-md)", padding: "10px 12px",
          display: "flex", alignItems: "flex-start", gap: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)", animation: "seSlideIn 0.2s ease",
        }}>
          <i className={`ti ${icon[t.level] || icon.info}`} style={{ fontSize: 16, color: fg[t.level] || fg.info, marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: fg[t.level] || fg.info, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {hdg[t.level] || "Info"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-primary)", lineHeight: 1.5 }}>{t.msg}</div>
          </div>
          <button onClick={() => onDismiss(t.id)} style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1, flexShrink: 0 }}>
            <i className="ti ti-x" />
          </button>
        </div>
      ))}
    </div>
  );
}


function ScenarioSelector({ value, onSelect }) {
  return (
    <Card>
      <SectionTitle>Моделювання сценарію — натисніть для автоматичного застосування</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {SCENARIOS.map(s => {
          const active = value === s.id;
          return (
            <div key={s.id} onClick={() => onSelect(s.id)} style={{
              padding: "8px 10px", borderRadius: "var(--border-radius-md)", cursor: "pointer",
              border: active ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
              background: active ? "var(--color-background-info)" : "var(--color-background-primary)",
              transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: 14, color: active ? "var(--color-text-info)" : "var(--color-text-secondary)" }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: active ? "var(--color-text-info)" : "var(--color-text-primary)" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


function SolarPanelEditor({ panels, onChange }) {
  const add    = () => onChange([...panels, { power: 300, voltage: 36, efficiency: 18.5, active: true }]);
  const remove = i => onChange(panels.filter((_,j) => j !== i));
  const upd    = (i, k, v) => onChange(panels.map((p,j) => j===i ? {...p,[k]:v} : p));

  return (
    <Card>
      <SectionTitle>Сонячні панелі</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {panels.map((p, i) => (
          <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Панель {i+1}</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={p.active} onChange={e => upd(i,"active",e.target.checked)} />
                  Активна
                </label>
                {panels.length > 1 && (
                  <button onClick={() => remove(i)} style={{ fontSize: 11, padding: "2px 8px", color: "var(--color-text-danger)" }}>Вилучити</button>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              <NumInput label="Потужність"      value={p.power}      min={0}   max={1000} step={10}  unit="W"  onChange={v => upd(i,"power",v)} />
              <NumInput label="Напруга"    value={p.voltage}    min={12}  max={72}              unit="V"  onChange={v => upd(i,"voltage",v)} />
              <NumInput label="Ефективність" value={p.efficiency} min={5}   max={25}   step={0.5} unit="%"  onChange={v => upd(i,"efficiency",v)} />
            </div>
          </div>
        ))}
        <button onClick={add} style={{ fontSize: 13, padding: "5px 12px", alignSelf: "flex-start" }}>
          <i className="ti ti-plus" style={{ marginRight: 4 }} />Додати панель
        </button>
      </div>
    </Card>
  );
}


function BatteryEditor({ batteries, onChange, batteryWarnings }) {
  const add    = () => onChange([...batteries, { capacity: 100, voltage: 12, soc: 75, chemistry: "AGM" }]);
  const remove = i => onChange(batteries.filter((_,j) => j !== i));
  const upd    = (i, k, v) => onChange(batteries.map((b,j) => j===i ? {...b,[k]:v} : b));

  return (
    <Card>
      <SectionTitle>Батареї</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {batteries.map((b, i) => {
          const warn       = batteryWarnings.find(w => w.index === i);
          const isLeadAcid = ["AGM","GEL","Flooded"].includes(b.chemistry);
          const barColor   = b.soc < 20 ? "#E24B4A" : b.soc < (isLeadAcid ? LEAD_ACID_WARN_SOC : 20) ? "#EF9F27" : "#639922";
          return (
            <div key={i} style={{
              background: warn?.level === "error" ? "#FFF8EC" : "var(--color-background-secondary)",
              border: warn?.level === "error" ? "0.5px solid #FAC775" : "0.5px solid transparent",
              borderRadius: "var(--border-radius-md)", padding: 12, transition: "all 0.25s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Батарея {i+1}</span>
                {batteries.length > 1 && (
                  <button onClick={() => remove(i)} style={{ fontSize: 11, padding: "2px 8px", color: "var(--color-text-danger)" }}>Вилучити</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <NumInput label="Ємність" value={b.capacity} min={10} max={1000} step={10} unit="Ah" onChange={v => upd(i,"capacity",v)} />
                <NumInput label="Напруга"  value={b.voltage}  min={6}  max={48}              unit="V"  onChange={v => upd(i,"voltage",v)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    SOC: <strong>{b.soc}%</strong>
                    {isLeadAcid && b.soc < LEAD_ACID_WARN_SOC && (
                      <span style={{ color: "#854F0B", marginLeft: 6 }}>⚠ нижче {LEAD_ACID_WARN_SOC}%</span>
                    )}
                  </label>
                  <input type="range" min={0} max={100} step={1} value={b.soc}
                    onChange={e => upd(i,"soc",Number(e.target.value))}
                    style={{ display: "block", width: "100%", marginTop: 4 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Тип батареї</label>
                  <select value={b.chemistry} onChange={e => upd(i,"chemistry",e.target.value)}
                    style={{ display: "block", marginTop: 4, fontSize: 13, padding: "4px 8px", width: "100%" }}>
                    {["AGM","LiFePO4","Li-ion","GEL","Flooded"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 7, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${b.soc}%`, background: barColor, borderRadius: 4, transition: "width 0.3s, background 0.3s" }} />
                </div>
                <Badge color={b.soc < 20 ? "red" : b.soc < 40 ? "amber" : "green"}>
                  {b.soc < 20 ? "Critical" : b.soc < 40 ? "Low" : "OK"}
                </Badge>
              </div>
              {warn && (
                <div style={{
                  marginTop: 8, fontSize: 11, lineHeight: 1.5, padding: "5px 8px", borderRadius: 4,
                  color: warn.level === "error" ? "#854F0B" : "#3B6D11",
                  background: warn.level === "error" ? "#FAEEDA" : "#EAF3DE",
                }}>
                  <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} />{warn.msg}
                </div>
              )}
              {b.chemistry === "LiFePO4" && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#0F6E56", background: "#E1F5EE", borderRadius: 4, padding: "4px 8px" }}>
                  LiFePO4: discharge to {LIFEPO4_MIN_SOC}% is safe. MPPT controller recommended.
                </div>
              )}
            </div>
          );
        })}
        <button onClick={add} style={{ fontSize: 13, padding: "5px 12px", alignSelf: "flex-start" }}>
          <i className="ti ti-plus" style={{ marginRight: 4 }} />Add battery
        </button>
      </div>
    </Card>
  );
}


function InverterEditor({ inverter, onChange }) {
  const pct      = Math.round(inverter.currentLoad / inverter.power * 100);
  const overload = pct >= 90;
  return (
    <Card>
      <SectionTitle>Інвертор</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <NumInput label="Номінальна потужність"  value={inverter.power}       min={200} max={10000} step={100} unit="W" onChange={v => onChange({...inverter,power:v})} />
        <NumInput label="Поточне навантаження" value={inverter.currentLoad} min={0}   max={inverter.power}  step={10}  unit="W" onChange={v => onChange({...inverter,currentLoad:v})} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 7, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(pct,100)}%`, background: overload ? "#E24B4A" : "#639922", borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 12, minWidth: 30, color: "var(--color-text-secondary)" }}>{pct}%</span>
        {overload && <Badge color="red">Перевантаження</Badge>}
      </div>
    </Card>
  );
}


function ChargeControllerEditor({ cc, onChange }) {
  return (
    <Card>
      <SectionTitle>Контролер заряду</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <NumInput label="Макс струм" value={cc.power}   min={10} max={100} step={5} unit="A" onChange={v => onChange({...cc,power:v})} />
        <NumInput label="Системна V"    value={cc.voltage} min={12} max={96}            unit="V" onChange={v => onChange({...cc,voltage:v})} />
      </div>
      <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Тип контролера</label>
      <div style={{ display: "flex", gap: 8 }}>
        {["MPPT","PWM"].map(t => (
          <div key={t} onClick={() => onChange({...cc,type:t})} style={{
            flex: 1, padding: "7px 0", textAlign: "center", cursor: "pointer",
            borderRadius: "var(--border-radius-md)", fontSize: 13, fontWeight: 500,
            border: cc.type===t ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
            background: cc.type===t ? "var(--color-background-info)" : "var(--color-background-primary)",
            color: cc.type===t ? "var(--color-text-info)" : "var(--color-text-primary)",
            transition: "all 0.15s",
          }}>{t}</div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5, background: "var(--color-background-secondary)", borderRadius: 4, padding: "6px 8px" }}>
        {cc.type === "MPPT"
          ? `MPPT відстежує точку максимальної потужності панелі → +25% ефективного струму заряду. ×${MPPT_EFFICIENCY_BONUS} застосовується до виробництва енергії.`
          : `Підтримує фіксоване задане значення напруги. Надлишкова напруга панелі розсіюється у вигляді тепла — без бонусу до ефективності (×${PWM_EFFICIENCY}).`}
      </div>
    </Card>
  );
}


function SensorEditor({ sensors, onChange, emergencyStop }) {
  const toggle = id => onChange(sensors.map(s => s.id===id ? {...s,enabled:!s.enabled} : s));
  return (
    <Card highlight={emergencyStop}>
      <SectionTitle>Датчики та модулі</SectionTitle>
      {emergencyStop && (
        <div style={{
          background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "var(--border-radius-md)",
          padding: "8px 12px", marginBottom: 10, fontSize: 12, color: "#A32D2D",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <i className="ti ti-alert-octagon" style={{ fontSize: 15 }} />
          <strong>Аварійна зупинка активна</strong> — Один або декілька критичних датчиків не працюють. Моделювання заблоковано.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {sensors.map(s => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 10px",
            background: !s.enabled && s.critical ? "#FCEBEB" : "var(--color-background-secondary)",
            border: !s.enabled && s.critical ? "0.5px solid #F09595" : "0.5px solid transparent",
            borderRadius: "var(--border-radius-md)", opacity: s.enabled ? 1 : 0.6,
            transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
              <Badge color={
                s.type==="Current" ? "blue" : s.type==="Voltage" ? "teal" :
                s.type==="Temperature" ? "amber" : s.type==="Relay" ? "purple" : "gray"
              }>{s.type}</Badge>
              {s.critical && <Badge color="red" small>critical</Badge>}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={s.enabled} onChange={() => toggle(s.id)} />
              {s.enabled ? "Enabled" : "Disabled"}
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
}


function SimulationResults({ system, scenario, ph }) {
  const sc = SCENARIOS.find(s => s.id === scenario) || SCENARIOS[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ borderLeft: `3px solid ${ph.emergencyStop ? "#E24B4A" : "var(--color-border-info)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <i className={`ti ${ph.emergencyStop ? "ti-alert-octagon" : sc.icon}`} style={{ fontSize: 16, color: ph.emergencyStop ? "#A32D2D" : "var(--color-text-info)" }} />
          <span style={{ fontWeight: 500, fontSize: 14 }}>
            {ph.emergencyStop ? "EMERGENCY STOP — system integrity compromised" : `Scenario: ${sc.label}`}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>{sc.desc}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ph.avgSOC < 25 && <Badge color="amber">Low SOC alert</Badge>}
          {ph.avgSOC < 20 && <Badge color="red">Economy mode (SWRL)</Badge>}
          {ph.emergencyStop && <Badge color="red">Emergency Stop</Badge>}
          {ph.invOverload && <Badge color="red">Overload risk</Badge>}
          {ph.chargeController && ph.controllerMult > 1 && <Badge color="teal">MPPT +25% boost</Badge>}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <MetricCard label="Ефективна генерація" value={`${ph.effectiveGen.toFixed(0)}W`}
          sub={`Raw ${ph.rawGeneration}W ×${ph.controllerMult}`}
          color={ph.effectiveGen > 0 ? "green" : "gray"} />
        <MetricCard label="Чиста потужність" value={`${ph.netPower > 0 ? "+" : ""}${ph.netPower.toFixed(0)}W`}
          sub={ph.netPower >= 0 ? "Надлишок → заряджання" : "Дефіцит → розряджання"}
          color={ph.netPower >= 0 ? "teal" : "amber"} />
        <MetricCard label="Рівень SOC" value={`${ph.avgSOC.toFixed(1)}%`}
          sub={`${system.batteries.length} батарея(ї)`}
          color={ph.avgSOC < 20 ? "red" : ph.avgSOC < 40 ? "amber" : "green"} />
        <MetricCard label="Навантаження інвертора" value={`${system.inverter.currentLoad}W`}
          sub={`${Math.round(system.inverter.currentLoad/system.inverter.power*100)}% з ${system.inverter.power}W`}
          color={ph.invOverload ? "red" : "green"} />
      </div>

      <Card>
        <SectionTitle>Компетентнісні питання — оновлення в реальному часі</SectionTitle>
        {ph.cq.map((cq, i) => (
          <div key={i} style={{
            display: "flex", gap: 10, padding: "9px 0",
            borderBottom: i < ph.cq.length-1 ? "0.5px solid var(--color-border-tertiary)" : "none",
          }}>
            <div style={{
              width: 19, height: 19, borderRadius: "50%", flexShrink: 0,
              background: cq.ok ? "#EAF3DE" : "#FCEBEB", color: cq.ok ? "#3B6D11" : "#A32D2D",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 600, marginTop: 1,
            }}>{i+1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>{cq.q}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{cq.a}</div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle>Оцінка SWRL правил</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {ph.swrlRules.map(r => {
            const good = r.id === "mppt_boost" || r.id === "autonomous";
            return (
              <div key={r.id} style={{
                display: "flex", gap: 10, padding: "8px 10px", borderRadius: "var(--border-radius-md)",
                background: r.fired ? (good ? "#EAF3DE" : "#FFF0F0") : "var(--color-background-secondary)",
                transition: "background 0.3s",
              }}>
                <Badge color={r.fired ? (good ? "green" : "red") : "gray"}>{r.fired ? "FIRED" : "idle"}</Badge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{r.name}</div>
                  <code style={{ fontSize: 10, color: "var(--color-text-secondary)", wordBreak: "break-all", lineHeight: 1.6 }}>{r.expr}</code>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>Система толопологія</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "center", padding: "6px 0" }}>
          {system.solarPanels.map((p,i) => (
            <div key={i} style={{
              padding: "5px 9px", borderRadius: "var(--border-radius-md)", fontSize: 11, fontWeight: 500,
              background: p.active ? "#EAF3DE" : "#F1EFE8", color: p.active ? "#3B6D11" : "#5F5E5A",
              border: `0.5px solid ${p.active ? "#C0DD97" : "#D3D1C7"}`,
            }}>
              <i className="ti ti-sun" style={{ marginRight: 3 }} />P{i+1} {p.active ? `${p.power}W` : "OFF"}
            </div>
          ))}
          <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>→</span>
          <div style={{ padding: "5px 9px", borderRadius: "var(--border-radius-md)", fontSize: 11, fontWeight: 500, background: "#E6F1FB", color: "#185FA5", border: "0.5px solid #B5D4F4" }}>
            {system.chargeController.type} ×{ph.controllerMult}
          </div>
          <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>→</span>
          {system.batteries.map((b,i) => (
            <div key={i} style={{
              padding: "5px 9px", borderRadius: "var(--border-radius-md)", fontSize: 11, fontWeight: 500,
              background: b.soc < 20 ? "#FCEBEB" : "#FAEEDA", color: b.soc < 20 ? "#A32D2D" : "#854F0B",
              border: `0.5px solid ${b.soc < 20 ? "#F7C1C1" : "#FAC775"}`,
            }}>
              <i className="ti ti-battery" style={{ marginRight: 3 }} />Bat{i+1} {b.soc}%
            </div>
          ))}
          <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>→</span>
          <div style={{
            padding: "5px 9px", borderRadius: "var(--border-radius-md)", fontSize: 11, fontWeight: 500,
            background: ph.invOverload ? "#FCEBEB" : "#EAF3DE", color: ph.invOverload ? "#A32D2D" : "#3B6D11",
            border: `0.5px solid ${ph.invOverload ? "#F7C1C1" : "#C0DD97"}`,
          }}>
            <i className="ti ti-plug" style={{ marginRight: 3 }} />Inv {system.inverter.currentLoad}W
          </div>
        </div>
      </Card>
    </div>
  );
}


function OntologyView({ system, dirtyProps }) {
  const [expanded, setExpanded] = useState(() => {
    const init = { EnergyComponent: true };
    ONTOLOGY_SCHEMA.children.forEach(c => { init[c.id] = true; });
    return init;
  });
  const toggle = id => setExpanded(e => ({ ...e, [id]: !e[id] }));

  function ClassNode({ node, depth = 0 }) {
    const isExp = expanded[node.id] !== false;
    const instanceIds = [...new Set(node.dataProps.flatMap(dp => dp.path(system).map(e => e.id)))];

    return (
      <div style={{ marginLeft: depth * 20 }}>
        <div onClick={() => toggle(node.id)} style={{
          display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
          padding: "5px 8px", borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)", marginBottom: 3, userSelect: "none",
        }}>
          <i className={`ti ${(node.children.length > 0 || node.dataProps.length > 0) ? (isExp ? "ti-chevron-down" : "ti-chevron-right") : "ti-minus"}`}
            style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 12 }} />
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: node.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{node.label}</span>
          <code style={{ fontSize: 10, color: "var(--color-text-secondary)", marginLeft: "auto" }}>owl:Class</code>
        </div>

        {isExp && instanceIds.length > 0 && (
          <div style={{ marginLeft: 24, marginBottom: 5 }}>
            {instanceIds.map(iid => (
              <div key={iid} style={{
                background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-md)", padding: "7px 10px", marginBottom: 5,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: node.color, marginBottom: 6 }}>
                  ◆ {iid}
                  <code style={{ fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: 6 }}>owl:NamedIndividual</code>
                </div>
                {node.dataProps.map(dp => {
                  const entry   = dp.path(system).find(e => e.id === iid);
                  if (!entry) return null;
                  const propKey = `${iid}::${dp.key}`;
                  const isDirty = dirtyProps.includes(propKey);
                  return (
                    <div key={dp.key} style={{
                      display: "flex", alignItems: "baseline", gap: 6, padding: "2px 6px",
                      borderRadius: 4, marginBottom: 2,
                      background: isDirty ? "#FFF8EC" : "transparent",
                      border: isDirty ? "0.5px solid #FAC775" : "0.5px solid transparent",
                      transition: "background 0.4s, border-color 0.4s",
                    }}>
                      {isDirty && <i className="ti ti-refresh" style={{ fontSize: 9, color: "#854F0B", flexShrink: 0 }} />}
                      <code style={{ fontSize: 11, color: "#185FA5" }}>se:{dp.key}</code>
                      <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>→</span>
                      <code style={{ fontSize: 11, color: isDirty ? "#854F0B" : "var(--color-text-primary)", fontWeight: isDirty ? 600 : 400 }}>
                        "{String(entry.v)}{dp.unit ? ` ${dp.unit}` : ""}"
                      </code>
                      {isDirty && <Badge color="amber" small>updated</Badge>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {isExp && node.children.map(child => <ClassNode key={child.id} node={child} depth={depth+1} />)}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <SectionTitle>Ієрархія OWL класів — se:EnergyComponent</SectionTitle>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.6 }}>
          Натисніть на клас щоб сховати / розкрити. Властивості, виділені спец{" "}
          <span style={{ background: "#FFF8EC", border: "0.5px solid #FAC775", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>кольором</span>{" "}
          змінено за останні 2 секунди — симуляція RDF оновлення.
        </p>
        <ClassNode node={ONTOLOGY_SCHEMA} depth={0} />
      </Card>

      <Card>
        <SectionTitle>Властивості об'єкта</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            ["Battery",      "se:chargesFrom",  "SolarPanel"],
            ["SolarPanel",   "se:controlledBy", "ChargeController"],
            ["Sensor",       "se:monitors",     "EnergyComponent"],
            ["Inverter",     "se:powersLoad",   "EnergyComponent"],
            ["SystemState",  "se:hasScenario",  "OperationScenario"],
          ].map(([from, prop, to], i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 12,
              background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "6px 10px",
            }}>
              <span style={{ fontWeight: 500, minWidth: 130 }}>{from}</span>
              <span style={{ color: "var(--color-text-secondary)" }}>→</span>
              <code style={{ color: "#185FA5", flexShrink: 0 }}>{prop}</code>
              <span style={{ color: "var(--color-text-secondary)" }}>→</span>
              <span style={{ fontWeight: 500 }}>{to}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Live RDF triple log — last changed triples</SectionTitle>
        {dirtyProps.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
            Змініть параметр моделі в <strong>Конфігурація</strong> вкладці щоб побачити змінти в реальному часі.
          </p>
        ) : (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 2, background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px" }}>
            {dirtyProps.map((p, i) => {
              const [iid, prop] = p.split("::");
              let val = "?";
              ONTOLOGY_SCHEMA.children.forEach(node => {
                node.dataProps.forEach(dp => {
                  if (dp.key === prop) {
                    const e = dp.path(system).find(e => e.id === iid);
                    if (e) val = String(e.v);
                  }
                });
              });
              return (
                <div key={i} style={{ color: "#854F0B" }}>
                  &lt;se:{iid}&gt; &lt;se:{prop}&gt; <span style={{ color: "#185FA5" }}>"{val}"</span> .
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}


function OWLModal({ owl, onClose, onDownload }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1500, padding: 16 }}
      onClick={onClose}>
      <div style={{
        background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "var(--border-radius-lg)", width: "100%", maxWidth: 700, maxHeight: "82vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>OWL / RDF перегляд онтології</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onDownload} style={{ fontSize: 13, padding: "4px 12px" }}>
              <i className="ti ti-download" style={{ marginRight: 4 }} />Завантажити .owl
            </button>
            <button onClick={onClose} style={{ fontSize: 13, padding: "4px 10px" }}>
              <i className="ti ti-x" />
            </button>
          </div>
        </div>
        <pre style={{ flex: 1, overflow: "auto", padding: "10px 14px", fontSize: 10.5, lineHeight: 1.7, margin: 0, fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
          {owl}
        </pre>
      </div>
    </div>
  );
}


export default function SmartEnergyLab() {
  const [system, setSystem]     = useState(() => JSON.parse(JSON.stringify(DEFAULT_SYSTEM)));
  const [ph, setPh] = useState({
  activePanels: [],
  rawGeneration: 0,
  effectiveGen: 0,
  avgSOC: 0,
  invOverload: false,
  netPower: 0,
  controllerMult: 1,
  batteryWarnings: [],
  sensorAlerts: [],
  emergencyStop: false,
  swrlRules: [],
  cq: []
  });
  const [scenario, setScenario] = useState("autonomous");
  const [tab, setTab]           = useState("config");
  const [simulated, setSimulated] = useState(false);
  const [showOWL, setShowOWL]   = useState(false);

  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((msg, level = "info") => {
    const id = ++toastIdRef.current;
    setToasts(t => [...t, { id, msg, level }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 7000);
  }, []);

  const dismissToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);


  const prevSnapshotRef = useRef({});
  const dirtyTimeoutRef = useRef(null);
  const [dirtyProps, setDirtyProps] = useState([]);

useEffect(() => {

  const simulate = async () => {

    try {

      const response = await fetch(
        `${API_URL}/api/energy/simulate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(system)
        }
      );

      const data = await response.json();

      setPh(data);

    } catch (err) {

      console.error(err);

    }

  };

  simulate();

  }, [system]);

  const criticalSensorKey = system.sensors
    .filter(s => s.critical)
    .map(s => `${s.id}:${s.enabled}`)
    .join(",");

  useEffect(() => {
    ph.sensorAlerts.forEach(a => addToast(a.msg, "critical"));
  }, [criticalSensorKey]);

  const batteryChemKey = system.batteries.map(b => `${b.soc}:${b.chemistry}`).join(",");
  useEffect(() => {
    ph.batteryWarnings
      .filter(w => w.level === "error")
      .forEach(w => addToast(w.msg, "error"));
  }, [batteryChemKey]);

  useEffect(() => {
    const newSnap = {};
    ONTOLOGY_SCHEMA.children.forEach(node => {
      node.dataProps.forEach(dp => {
        dp.path(system).forEach(({ id, v }) => {
          newSnap[`${id}::${dp.key}`] = String(v);
        });
      });
    });

    const changed = Object.keys(newSnap).filter(k => prevSnapshotRef.current[k] !== newSnap[k]);
    if (changed.length > 0) {
      setDirtyProps(changed);
      clearTimeout(dirtyTimeoutRef.current);
      dirtyTimeoutRef.current = setTimeout(() => setDirtyProps([]), 2000);
    }
    prevSnapshotRef.current = newSnap;
  }, [system]);

  const applyScenario = useCallback((id) => {
    setScenario(id);
    const sc = SCENARIOS.find(s => s.id === id);
    if (!sc) return;
    setSystem(prev => ({ ...prev, ...sc.apply(prev) }));
    addToast(`Сценарій "${sc.label}" застосовано — системні параметри оновлюються автоматично.`, "info");
  }, [addToast]);

  const updateSystem = useCallback((key, val) => setSystem(s => ({ ...s, [key]: val })), []);

  const getOWL = () =>
    generateOWL(system, SCENARIOS.find(s => s.id === scenario)?.label || scenario, ph);

  const downloadOWL = () => {
    const blob = new Blob([getOWL()], { type: "application/rdf+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "smartenergy_lab_ontology.owl"; a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { id: "config",   label: "Конфігурація", icon: "ti-settings" },
    { id: "results",  label: "Симуляція",    icon: "ti-chart-bar" },
    { id: "ontology", label: "Онтологія", icon: "ti-binary-tree" },
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 820, margin: "0 auto", padding: "1.5rem 1rem" }}>

      <style>{`@keyframes seSlideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>SmartEnergy Lab</h1>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "3px 0 0" }}>
            Онтологічна система проектування
            {ph.emergencyStop && (
              <span style={{ marginLeft: 10, color: "#A32D2D", fontWeight: 600 }}>⚠ АВАРІЙНА ЗУПИНКА</span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowOWL(true)} style={{ fontSize: 13, padding: "5px 12px" }}>
            <i className="ti ti-file-export" style={{ marginRight: 4 }} />Перегляд OWL
          </button>
          <button onClick={downloadOWL} style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>
            <i className="ti ti-download" style={{ marginRight: 4 }} />Експорт .owl
          </button>
        </div>
      </div>

      <div style={{ display: "flex", marginBottom: "1rem", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize: 13, padding: "7px 16px", borderRadius: 0, background: "transparent",
            borderBottom: tab === t.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
            color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: tab === t.id ? 500 : 400,
          }}>
            <i className={`ti ${t.icon}`} style={{ marginRight: 5 }} />
            {t.label}
            {t.id === "config" && ph.emergencyStop && (
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#E24B4A", marginLeft: 5, verticalAlign: "middle" }} />
            )}
            {t.id === "ontology" && dirtyProps.length > 0 && (
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#EF9F27", marginLeft: 5, verticalAlign: "middle" }} />
            )}
          </button>
        ))}
      </div>

      {tab === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ScenarioSelector value={scenario} onSelect={applyScenario} />
          <SolarPanelEditor panels={system.solarPanels} onChange={v => updateSystem("solarPanels", v)} />
          <BatteryEditor
            batteries={system.batteries}
            onChange={v => updateSystem("batteries", v)}
            batteryWarnings={ph.batteryWarnings}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <InverterEditor inverter={system.inverter} onChange={v => updateSystem("inverter", v)} />
            <ChargeControllerEditor cc={system.chargeController} onChange={v => updateSystem("chargeController", v)} />
          </div>
          <SensorEditor
            sensors={system.sensors}
            onChange={v => updateSystem("sensors", v)}
            emergencyStop={ph.emergencyStop}
          />
          <button
            onClick={() => { setSimulated(true); setTab("results"); }}
            disabled={ph.emergencyStop}
            title={ph.emergencyStop ? "Cannot simulate: Emergency Stop active — re-enable all critical sensors" : ""}
            style={{
              padding: "9px 22px", fontSize: 14, fontWeight: 500, alignSelf: "flex-end",
              background: ph.emergencyStop ? "#D3D1C7" : "var(--color-text-primary)",
              color: ph.emergencyStop ? "#888780" : "var(--color-background-primary)",
              border: "none", cursor: ph.emergencyStop ? "not-allowed" : "pointer",
              borderRadius: "var(--border-radius-md)", transition: "background 0.2s",
            }}
          >
            <i className="ti ti-player-play" style={{ marginRight: 5 }} />
            {ph.emergencyStop ? "Симуляція заблокована (аварійна зупинка)" : "Запустити симуляцію →"}
          </button>
        </div>
      )}

      {tab === "results" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!simulated ? (
            <Card>
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--color-text-secondary)" }}>
                <i className="ti ti-chart-bar" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13 }}>
                  Налаштуйте свою систему в <strong>Конфігурація</strong> і натисніть <strong>Запустити симуляцію →</strong>
                </p>
              </div>
            </Card>
          ) : (
            <SimulationResults system={system} scenario={scenario} ph={ph} />
          )}
          {simulated && (
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => { setSimulated(false); setTab("config"); }} style={{ fontSize: 13, padding: "5px 12px" }}>
                ← Edit configuration
              </button>
              <button onClick={downloadOWL} style={{ fontSize: 13, padding: "5px 12px", fontWeight: 500 }}>
                <i className="ti ti-download" style={{ marginRight: 4 }} />Export ontology (.owl)
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "ontology" && (
        <OntologyView system={system} dirtyProps={dirtyProps} />
      )}

      <ToastArea toasts={toasts} onDismiss={dismissToast} />

      {showOWL && <OWLModal owl={getOWL()} onClose={() => setShowOWL(false)} onDownload={downloadOWL} />}
    </div>
  );
}