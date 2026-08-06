import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

/** Pulls a rough snapshot of a user's public repos to ground the interviewer's questions. */
export async function scrapeGithub(username: string) {
  const httpsAgent = process.env.PROXY_URL
    ? new HttpsProxyAgent(process.env.PROXY_URL)
    : undefined;

  const userRepos = await axios.request({
    url: `https://api.github.com/users/${username}/repos`,
    httpsAgent,
  });

  return userRepos.data.map((x: any) => ({
    description: x.description,
    name: x.name,
    fullName: x.full_name,
    starCount: x.stargazers_count,
  }));
}
