zipLib() {
	mkdir boots/$1
	cd $1
	if [ -d htdocs ]
	then
		cp -pfRL htdocs ../boots/$1/
	fi
	cd helma
	zip -9 -r ../../boots/$1/$1.zip * -x "*/.DS_Store" "*/.svn/*"
	cd ../..
}

mkdir boots

zipLib "base"
zipLib "edit"
zipLib "type"
zipLib "post"
zipLib "wiki"
zipLib "feed"

if [ -f boots.zip ]
then
	rm boots.zip
fi
zip -9 -r boots.zip boots/* -x "*/.DS_Store" "*/.svn/*"

rm -fr boots
