{episode?.servers?.length ? (
    <select
      onChange={(event) => setActiveServer(event.target.value)}
      value={activeServer}
      aria-label="Select streaming server"
    >
      {episode.servers.map((server, index) => (
        <option key={index} value={server.real_video}>
          {server.real_video ? `Server ${server.option ?? index + 1}` : 'Unavailable'}
        </option>
      ))}
    </select>
  ) : (
    <p>No servers available.</p>
  )}