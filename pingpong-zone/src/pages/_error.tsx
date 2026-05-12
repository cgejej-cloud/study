import type { NextPageContext } from "next";

function Error({ statusCode }: { statusCode: number }) {
  return null;
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? ((err as unknown as {statusCode?: number}).statusCode ?? 404) : 404;
  return { statusCode };
};

export default Error;
