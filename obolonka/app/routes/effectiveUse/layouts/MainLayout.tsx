import Header from "../components/Header";
import Footer from "../components/Footer";
import Sidebar from "../components/Sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainLayout({
  children,
}: MainLayoutProps) {
  return (

    <div className="d-flex bg-light">

      <Sidebar />

      <div className="flex-grow-1 d-flex flex-column min-vh-100">

        <div className="container py-4 flex-grow-1">

          <Header />
      
      <main>
        <div>
          {children}
        </div>
      </main>
      </div>

        <Footer />

      </div>

    </div>

  );
}

export default MainLayout;