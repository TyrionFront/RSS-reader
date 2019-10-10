export const parseRss = (data, feeds) => {
  const domParser = new DOMParser();
  const domTree = domParser.parseFromString(data, 'application/xml');
  const parserError = domTree.querySelector('parsererror');
  if (parserError) {
    throw new Error('Wrong data format: \'application/xml\'-method can not parse it');
  }
  const title = domTree.querySelector('channel title').textContent;
  const sameFeed = feeds.find(({ feedTitle }) => feedTitle === title);
  if (sameFeed) {
    throw new Error(`SameFeed already exists:\n  ${sameFeed}`);
  }
  const description = domTree.querySelector('channel description').textContent;

  const postData = [...domTree.querySelectorAll('item')].map((item) => {
    const postTitle = item.querySelector('title').textContent;
    const postLink = item.querySelector('link').textContent;
    const postDescription = item.querySelector('description').textContent;
    return [postTitle, postLink, postDescription];
  }).reverse();
  return { feedInfo: [title, description], postData };
};

export const updatePosts = (postsData, currentFeedId, appState) => {
  const { posts } = appState;
  const { all } = posts;
  const currentFeedAllPosts = all[currentFeedId] ? all[currentFeedId] : [];
  const newPosts = postsData.reduce((acc, post) => {
    const [title] = post;
    const samePost = currentFeedAllPosts.find(([postTitle]) => postTitle === title);
    if (samePost) {
      return acc;
    }
    currentFeedAllPosts.push(post);
    const postId = `${currentFeedId}-post${acc.length + 1}`;
    return [...acc, [...post, postId]];
  }, []);
  all[currentFeedId] = currentFeedAllPosts;
  posts.fresh = newPosts;
};

export const updateFeeds = (feedInfo, feedId, url, appState) => {
  const [feedTitle, feedDescription] = feedInfo;
  const { feeds, posts } = appState;
  const currentFeedAllPostsSize = posts.all[feedId].length;
  const updatedFeeds = [
    ...feeds,
    {
      feedId, feedTitle, feedDescription, currentFeedAllPostsSize, url,
    },
  ];
  appState.feeds = updatedFeeds;// eslint-disable-line no-param-reassign
};
