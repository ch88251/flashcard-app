function DomainSelect({ domains, onSelect }) {
  return (
    <div style={{ textAlign: "center", marginTop: "1rem", marginBottom: "2rem" }}>
      <label htmlFor="domain" className="block mb-2 text-lg font-medium text-indigo-700">Select a Subject: </label>
      <select data-testid="subject" id="domain" onChange={(e) => onSelect(e.target.value)}>
        <option value="">-- Choose One --</option>
        {domains.map((domain, idx) => (
          <option key={idx} value={domain}>
            {domain}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DomainSelect;
