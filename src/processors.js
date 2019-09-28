export default (domString, parsingType) => {
  const domParser = new DOMParser();
  const data = domParser.parseFromString(domString, parsingType);
  const parserError = data.querySelector('parsererror');
  if (parserError) {
    throw new Error('data format is not .rss or .xml');
  }
  const newsTitles = [...data.querySelectorAll('item title')];
  const newsLinks = [...data.querySelectorAll('item link')];
  const buffer = document.createElement('div');
  const newsDescriptions = [...data.querySelectorAll('item description')]
    .map((elem) => { // in case if there is html-tags in previously parsed text
      buffer.innerHTML = elem.textContent;
      return buffer.textContent;
    });
  const newsData = newsTitles
    .map(({ textContent }, i) => [textContent, newsLinks[i].textContent, newsDescriptions[i]])
    .reverse();

  const title = data.querySelector('channel title').textContent;
  const description = data.querySelector('channel description').textContent;
  return { info: [title, description], newsData };
};
