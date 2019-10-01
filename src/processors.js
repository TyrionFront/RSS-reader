export default (data) => {
  const domParser = new DOMParser();
  const domTree = domParser.parseFromString(data, 'application/xml');
  const parserError = domTree.querySelector('parsererror');
  if (parserError) {
    throw new Error('Data format is wrong: \'application/xml\'-method can not parse it');
  }

  const descriptionBuffer = document.createElement('div');
  const getPureDescription = (description) => {
    descriptionBuffer.innerHTML = description;
    return descriptionBuffer.textContent;
  };
  const newsData = [...domTree.querySelectorAll('item')].map((item) => {
    const storyTitle = item.querySelector('title').textContent;
    const storyLink = item.querySelector('link').textContent;
    const storyDescription = item.querySelector('description').textContent;
    return [storyTitle, storyLink, getPureDescription(storyDescription)];
  });
  const feedTitle = domTree.querySelector('channel title').textContent;
  const feedDescription = domTree.querySelector('channel description').textContent;
  return { feedInfo: [feedTitle, feedDescription], newsData };
};
