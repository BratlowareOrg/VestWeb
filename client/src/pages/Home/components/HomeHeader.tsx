interface HomeHeaderProps {
  greeting: string;
  studentFirstName: string;
}

const HomeHeader = ({ greeting, studentFirstName }: HomeHeaderProps) => (
  <div className="home-header">
    <h1>
      {greeting}
      , <span>{studentFirstName}</span>!
    </h1>
    <p>Tudo pronto para mais um dia de estudos?</p>
  </div>
);

export default HomeHeader;
