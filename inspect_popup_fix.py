import time
import app
app.show_quote_once()
time.sleep(1.5)
popup = app.ACTIVE_POPUP.get('popup')
print('popup_is_none=', popup is None)
print('children=', popup.winfo_children() if popup else None)
print('title=', popup.title() if popup else None)
if popup:
    frame = popup.winfo_children()[0]
    texts = [child.cget('text') for child in frame.winfo_children() if hasattr(child, 'cget') and hasattr(child, 'winfo_class') and child.winfo_class() in ('Label', 'Button')]
    print('texts=', texts)
    app.close_active_popup()
