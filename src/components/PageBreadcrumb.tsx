
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface PageBreadcrumbProps {
  currentPage: string;
  parentPage?: {
    name: string;
    path: string;
  };
}

const PageBreadcrumb = ({ currentPage, parentPage }: PageBreadcrumbProps) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <Breadcrumb>
        <BreadcrumbList>
          {parentPage && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate(parentPage.path)}
                  className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {parentPage.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 dark:text-white font-medium">
              {currentPage}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default PageBreadcrumb;
