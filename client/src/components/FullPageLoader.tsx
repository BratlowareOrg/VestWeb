interface FullPageLoaderProps {
  message?: string;
}

const FullPageLoader = ({ message = 'Carregando...' }: FullPageLoaderProps) => {
  return (
    <div className="full-page-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="spinner" />
      <p className="full-page-loader__message">{message}</p>
    </div>
  );
};

export default FullPageLoader;
