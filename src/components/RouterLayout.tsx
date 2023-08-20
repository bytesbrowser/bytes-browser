export const RouterLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="layout">
      <div className="sidebar"></div>
      <div className="content">{children}</div>
    </div>
  );
};
