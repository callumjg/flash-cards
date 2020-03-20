import { useEffect, useState } from "react";
import api from "../../apis/serverApi";

export default function useResource(url, defaultData = {}) {
  const [data, setData] = useState(defaultData);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [toggle, setToggle] = useState(false);

  const refresh = () => setToggle(!toggle);

  useEffect(() => {
    if (!url) return;
    (async () => {
      setIsLoading(true);
      try {
        const response = await api.get(url);
        setData(response.data);
      } catch (e) {
        console.error(e);
        let message = e.response ? e.response.data.error : e.message;
        let errors = e.response && e.response.data && e.response.data.errors;
        setError(message);
        setErrors(errors);
      }
      setIsLoading(false);
    })();
  }, [url, toggle, api]);
  return [url ? data : defaultData, error, isLoading, { errors, refresh }];
}